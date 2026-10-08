package com.transportes.auth.servicios;

import com.transportes.auth.dto.PruebaRecuperacionResponse;
import com.transportes.auth.dto.SolicitudRecuperacionResponse;
import com.transportes.auth.entidades.PasswordResetToken;
import com.transportes.auth.excepciones.CorreoNoDisponibleException;
import com.transportes.auth.excepciones.RecuperacionContrasenaException;
import com.transportes.auth.repositorios.PasswordResetTokenRepository;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.OptionalLong;
import java.util.regex.Pattern;

/**
 * Recuperacion de contrasena por correo: solicitar codigo, verificarlo y fijar la nueva contrasena.
 *
 * <p>Principios:</p>
 * <ul>
 *   <li><b>Sin enumeracion de cuentas.</b> Solicitar un codigo responde siempre lo mismo (exista
 *       o no la cuenta, este activa o sea de Google). Los errores de verificacion tampoco
 *       distinguen entre "no existe", "vencido", "usado" o "incorrecto".</li>
 *   <li><b>El codigo nunca se guarda en claro</b> (HMAC con secreto del servidor) y se compara
 *       en tiempo constante.</li>
 *   <li><b>Intentos limitados</b> por desafio (base de datos) y por IP/correo (memoria).</li>
 *   <li><b>Un solo uso, tambien con concurrencia:</b> el desafio se consume con un UPDATE
 *       condicional dentro de la misma transaccion que cambia la contrasena.</li>
 *   <li><b>El cliente no elige la cuenta:</b> la prueba firmada identifica al desafio y de
 *       ahi se obtiene el usuario.</li>
 *   <li>El correo se envia <b>fuera</b> de la transaccion (el pool de conexiones es pequeno).</li>
 * </ul>
 */
@Service
public class RecuperacionContrasenaService {

    public static final String MENSAJE_GENERICO =
            "Si existe una cuenta elegible asociada a ese correo, recibirás las instrucciones para recuperar tu contraseña.";

    static final int LONGITUD_CODIGO = 6;

    private static final Logger log = LoggerFactory.getLogger(RecuperacionContrasenaService.class);
    private static final Pattern FORMATO_CORREO = Pattern.compile("^\\S+@\\S+\\.\\S+$");
    private static final Pattern FORMATO_CODIGO = Pattern.compile("^\\d{" + LONGITUD_CODIGO + "}$");
    private static final Duration VENTANA_LIMITES = Duration.ofMinutes(15);
    private static final int MAX_REINTENTOS_CODIGO_UNICO = 5;

    private enum Veredicto { OK, INVALIDO, AGOTADO }

    private record ResultadoVerificacion(Veredicto veredicto, Long idToken) {
    }

    private final UsuarioRepository usuarios;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final CorreoRecuperacionServicio correo;
    private final TransactionTemplate tx;
    private final CriptoRecuperacion cripto;

    private final int codigoMinutos;
    private final int ventanaCambioMinutos;
    private final int maxIntentos;
    private final int reenvioSegundos;
    private final int maxSolicitudesHora;

    private final LimitadorVentana porIpSolicitud;
    private final LimitadorVentana cooldownCorreo;
    private final LimitadorVentana porIpVerificacion;
    private final LimitadorVentana fallosVerificacion;
    private final LimitadorVentana porIpCambio;

    public RecuperacionContrasenaService(
            UsuarioRepository usuarios,
            PasswordResetTokenRepository tokens,
            PasswordEncoder encoder,
            CorreoRecuperacionServicio correo,
            PlatformTransactionManager transactionManager,
            @Value("${recuperacion.secreto}") String secreto,
            @Value("${recuperacion.codigo-minutos:10}") int codigoMinutos,
            @Value("${recuperacion.ventana-cambio-minutos:10}") int ventanaCambioMinutos,
            @Value("${recuperacion.max-intentos:5}") int maxIntentos,
            @Value("${recuperacion.reenvio-segundos:60}") int reenvioSegundos,
            @Value("${recuperacion.max-solicitudes-hora:5}") int maxSolicitudesHora,
            @Value("${recuperacion.max-solicitudes-ip:10}") int maxSolicitudesIp,
            @Value("${recuperacion.max-verificaciones-ip:30}") int maxVerificacionesIp,
            @Value("${recuperacion.max-cambios-ip:20}") int maxCambiosIp) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.encoder = encoder;
        this.correo = correo;
        this.tx = new TransactionTemplate(transactionManager);
        this.cripto = new CriptoRecuperacion(secreto);
        this.codigoMinutos = codigoMinutos;
        this.ventanaCambioMinutos = ventanaCambioMinutos;
        this.maxIntentos = maxIntentos;
        this.reenvioSegundos = reenvioSegundos;
        this.maxSolicitudesHora = maxSolicitudesHora;
        this.porIpSolicitud = new LimitadorVentana(maxSolicitudesIp, VENTANA_LIMITES);
        this.cooldownCorreo = new LimitadorVentana(1, Duration.ofSeconds(reenvioSegundos));
        this.porIpVerificacion = new LimitadorVentana(maxVerificacionesIp, VENTANA_LIMITES);
        this.fallosVerificacion = new LimitadorVentana(Integer.MAX_VALUE, VENTANA_LIMITES);
        this.porIpCambio = new LimitadorVentana(maxCambiosIp, VENTANA_LIMITES);
    }

    // ------------------------------------------------------------------ solicitar / reenviar

    /**
     * Paso 1 (y reenvio): emite un codigo y lo envia por correo si la cuenta es elegible.
     * La respuesta es la misma en todos los casos salvo limites de uso y fallo del proveedor.
     */
    public SolicitudRecuperacionResponse solicitarCodigo(String correoCrudo, String ip) {
        String direccion = normalizarCorreo(correoCrudo);

        if (!porIpSolicitud.permitir("ip:" + ipSegura(ip))) {
            throw demasiadasSolicitudes();
        }
        String claveCorreo = "mail:" + CriptoRecuperacion.sha256Hex(direccion);
        // El enfriamiento aplica a cualquier correo para no revelar cuales existen.
        if (!cooldownCorreo.permitir(claveCorreo)) {
            throw new RecuperacionContrasenaException(HttpStatus.TOO_MANY_REQUESTS,
                    "Espera un momento antes de solicitar otro código.");
        }
        fallosVerificacion.reiniciar(claveCorreo);

        Usuario usuario = usuarios.findByCorreoIgnoreCase(direccion).orElse(null);
        if (usuario == null || !usuario.estaActivo()) {
            return respuestaGenerica(); // sin pistas: ni cuenta inexistente ni inactiva se distinguen
        }

        if (usuario.getContrasenaHash() == null) {
            // Cuenta creada con Google: no tiene contrasena local. Se le avisa por correo
            // (sin codigo) y su acceso con Google no se toca.
            if (usuario.getGoogleId() != null) {
                try {
                    correo.enviarAvisoCuentaGoogle(usuario.getNombres(), usuario.getCorreo());
                } catch (RuntimeException e) {
                    log.warn("No se pudo enviar el aviso de cuenta Google al usuario {}.", usuario.getIdUsuario());
                }
            }
            return respuestaGenerica();
        }

        Integer idUsuario = usuario.getIdUsuario();
        if (tokens.countByIdUsuarioAndFechaCreacionAfter(idUsuario, ahoraUtc().minusHours(1)) >= maxSolicitudesHora) {
            log.warn("Límite horario de recuperación alcanzado para el usuario {}.", idUsuario);
            return respuestaGenerica();
        }

        emitirYEnviar(usuario);
        return respuestaGenerica();
    }

    private void emitirYEnviar(Usuario usuario) {
        Integer idUsuario = usuario.getIdUsuario();

        for (int intento = 0; intento < MAX_REINTENTOS_CODIGO_UNICO; intento++) {
            String codigo = cripto.generarCodigo(LONGITUD_CODIGO);
            String hash = cripto.hashCodigo(idUsuario, codigo);

            Long idToken;
            try {
                idToken = tx.execute(estado -> {
                    if (tokens.existsByTokenHash(hash)) {
                        return null; // coincidencia con un codigo antiguo del mismo usuario: se genera otro
                    }
                    LocalDateTime ahora = ahoraUtc();
                    tokens.invalidarPendientes(idUsuario, ahora); // una politica clara: solo vale el ultimo codigo
                    PasswordResetToken nuevo = new PasswordResetToken();
                    nuevo.setIdUsuario(idUsuario);
                    nuevo.setTokenHash(hash);
                    nuevo.setFechaCreacion(ahora);
                    nuevo.setFechaExpiracion(ahora.plusMinutes(codigoMinutos));
                    nuevo.setIntentos(0);
                    return tokens.saveAndFlush(nuevo).getId();
                });
            } catch (DataIntegrityViolationException e) {
                idToken = null; // carrera improbable sobre token_hash UNIQUE: se reintenta con otro codigo
            }
            if (idToken == null) {
                continue;
            }

            try {
                correo.enviarCodigo(usuario.getNombres(), usuario.getCorreo(), codigo, codigoMinutos);
            } catch (CorreoNoDisponibleException e) {
                // El proveedor no confirmo el envio: el codigo no sirve de nada, se cierra.
                final Long idParaCerrar = idToken;
                tx.executeWithoutResult(estado -> tokens.invalidar(idParaCerrar, ahoraUtc()));
                throw e;
            }
            return;
        }
        throw new IllegalStateException("No se pudo generar un código de recuperación único.");
    }

    // ------------------------------------------------------------------ verificar

    /** Paso 2: comprueba el codigo y, si es correcto, entrega la prueba para fijar la contrasena. */
    public PruebaRecuperacionResponse verificarCodigo(String correoCrudo, String codigoCrudo, String ip) {
        String direccion = normalizarCorreo(correoCrudo);

        if (!porIpVerificacion.permitir("ip:" + ipSegura(ip))) {
            throw demasiadasSolicitudes();
        }
        String claveCorreo = "mail:" + CriptoRecuperacion.sha256Hex(direccion);
        if (fallosVerificacion.cantidad(claveCorreo) >= maxIntentos) {
            throw intentosAgotados();
        }

        String codigo = codigoCrudo == null ? "" : codigoCrudo.replaceAll("\\s+", "");
        if (!FORMATO_CODIGO.matcher(codigo).matches()) {
            throw falloDeVerificacion(claveCorreo);
        }

        ResultadoVerificacion resultado = tx.execute(estado -> {
            Usuario usuario = usuarios.findByCorreoIgnoreCase(direccion).orElse(null);
            if (usuario == null || !usuario.estaActivo() || usuario.getContrasenaHash() == null) {
                return new ResultadoVerificacion(Veredicto.INVALIDO, null);
            }
            LocalDateTime ahora = ahoraUtc();
            List<PasswordResetToken> pendientes = tokens.buscarPendientesParaVerificar(usuario.getIdUsuario(), ahora);
            if (pendientes.isEmpty()) {
                return new ResultadoVerificacion(Veredicto.INVALIDO, null);
            }
            PasswordResetToken token = pendientes.get(0);

            String esperado = cripto.hashCodigo(usuario.getIdUsuario(), codigo);
            if (!CriptoRecuperacion.iguales(esperado, token.getTokenHash())) {
                int intentos = token.getIntentos() + 1;
                token.setIntentos(intentos);
                if (intentos >= maxIntentos) {
                    token.setFechaUso(ahora); // desafio quemado: hay que pedir uno nuevo
                    tokens.save(token);
                    return new ResultadoVerificacion(Veredicto.AGOTADO, null);
                }
                tokens.save(token);
                return new ResultadoVerificacion(Veredicto.INVALIDO, null);
            }

            token.setFechaVerificacion(ahora); // el codigo ya no puede verificarse otra vez
            tokens.save(token);
            return new ResultadoVerificacion(Veredicto.OK, token.getId());
        });

        if (resultado.veredicto() == Veredicto.OK) {
            fallosVerificacion.reiniciar(claveCorreo);
            long segundos = ventanaCambioMinutos * 60L;
            String prueba = cripto.emitirPrueba(resultado.idToken(), Instant.now().plusSeconds(segundos));
            return new PruebaRecuperacionResponse(prueba, segundos);
        }
        if (resultado.veredicto() == Veredicto.AGOTADO) {
            fallosVerificacion.registrar(claveCorreo);
            throw intentosAgotados();
        }
        throw falloDeVerificacion(claveCorreo);
    }

    private RecuperacionContrasenaException falloDeVerificacion(String claveCorreo) {
        int fallos = fallosVerificacion.registrar(claveCorreo);
        return fallos >= maxIntentos ? intentosAgotados() : codigoInvalido();
    }

    // ------------------------------------------------------------------ completar

    /** Paso 3: con la prueba verificada, fija la nueva contrasena y consume el desafio. */
    public void completarRecuperacion(String prueba, String contrasena, String confirmacion, String ip) {
        if (!porIpCambio.permitir("ip:" + ipSegura(ip))) {
            throw demasiadasSolicitudes();
        }
        validarContrasena(contrasena, confirmacion);

        OptionalLong idToken = cripto.validarPrueba(prueba, Instant.now());
        if (idToken.isEmpty()) {
            throw verificacionVencida();
        }
        long id = idToken.getAsLong();

        tx.executeWithoutResult(estado -> {
            LocalDateTime ahora = ahoraUtc();
            PasswordResetToken token = tokens.findById(id).orElseThrow(this::verificacionVencida);
            Integer idUsuario = token.getIdUsuario();

            // Solo una peticion puede ganar este UPDATE; si otra ya lo consumio, devuelve 0.
            if (tokens.consumirVerificado(id, ahora, ahora.minusMinutes(ventanaCambioMinutos)) != 1) {
                throw verificacionVencida();
            }

            Usuario usuario = usuarios.findById(idUsuario).orElseThrow(this::verificacionVencida);
            if (!usuario.estaActivo()) {
                throw verificacionVencida(); // revierte tambien el consumo del desafio
            }
            usuario.setContrasenaHash(encoder.encode(contrasena));
            usuario.setFechaActualizacion(LocalDateTime.now());
            usuarios.save(usuario);

            // Cualquier otro codigo pendiente de la cuenta deja de servir.
            tokens.invalidarPendientes(idUsuario, ahora);
        });
        log.info("Contraseña restablecida mediante recuperación (desafío {}).", id);
    }

    private void validarContrasena(String contrasena, String confirmacion) {
        if (contrasena == null || contrasena.isBlank()) {
            throw new RecuperacionContrasenaException(HttpStatus.BAD_REQUEST, "La contraseña es obligatoria.");
        }
        if (contrasena.length() < 8) {
            throw new RecuperacionContrasenaException(HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener al menos 8 caracteres.");
        }
        if (contrasena.getBytes(StandardCharsets.UTF_8).length > 72) {
            // Mismo limite de BCrypt que usa el registro.
            throw new RecuperacionContrasenaException(HttpStatus.BAD_REQUEST,
                    "La contraseña supera el límite de 72 bytes de BCrypt");
        }
        if (!contrasena.equals(confirmacion)) {
            throw new RecuperacionContrasenaException(HttpStatus.BAD_REQUEST, "Las contraseñas no coinciden.");
        }
    }

    // ------------------------------------------------------------------ mantenimiento

    @Scheduled(fixedDelay = 300_000L, initialDelay = 300_000L)
    public void purgarLimitadores() {
        porIpSolicitud.purgar();
        cooldownCorreo.purgar();
        porIpVerificacion.purgar();
        fallosVerificacion.purgar();
        porIpCambio.purgar();
    }

    /** Borra desafios vencidos hace mas de 7 dias (se conservan unos dias para auditoria). */
    @Scheduled(cron = "0 30 3 * * *")
    public void eliminarDesafiosAntiguos() {
        Integer borrados = tx.execute(estado -> tokens.eliminarVencidosAntesDe(ahoraUtc().minusDays(7)));
        if (borrados != null && borrados > 0) {
            log.info("Se eliminaron {} desafíos de recuperación antiguos.", borrados);
        }
    }

    // ------------------------------------------------------------------ utilidades

    private SolicitudRecuperacionResponse respuestaGenerica() {
        return new SolicitudRecuperacionResponse(MENSAJE_GENERICO, codigoMinutos, reenvioSegundos);
    }

    private static String normalizarCorreo(String crudo) {
        String correo = crudo == null ? "" : crudo.strip().toLowerCase(Locale.ROOT);
        if (correo.isEmpty() || correo.length() > 150 || !FORMATO_CORREO.matcher(correo).matches()) {
            throw new RecuperacionContrasenaException(HttpStatus.BAD_REQUEST, "Ingresa un correo electrónico válido.");
        }
        return correo;
    }

    private static String ipSegura(String ip) {
        return ip == null || ip.isBlank() ? "desconocida" : ip;
    }

    private static LocalDateTime ahoraUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private static RecuperacionContrasenaException demasiadasSolicitudes() {
        return new RecuperacionContrasenaException(HttpStatus.TOO_MANY_REQUESTS,
                "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.");
    }

    private static RecuperacionContrasenaException intentosAgotados() {
        return new RecuperacionContrasenaException(HttpStatus.TOO_MANY_REQUESTS,
                "Superaste el número de intentos. Solicita un código nuevo.");
    }

    private static RecuperacionContrasenaException codigoInvalido() {
        return new RecuperacionContrasenaException(HttpStatus.BAD_REQUEST,
                "El código es incorrecto o ha caducado. Revísalo o solicita uno nuevo.");
    }

    private RecuperacionContrasenaException verificacionVencida() {
        return new RecuperacionContrasenaException(HttpStatus.GONE,
                "La verificación venció o ya se utilizó. Solicita un nuevo código para continuar.");
    }
}
