package com.transportes.auth.servicios;

import com.transportes.auth.dto.IdentidadGoogle;
import com.transportes.auth.dto.LoginResponse;
import com.transportes.auth.dto.UsuarioResumenResponse;
import com.transportes.auth.excepciones.CredencialesInvalidasException;
import com.transportes.auth.excepciones.CuentaExistenteException;
import com.transportes.security.servicios.JwtService;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Inicio de sesion, registro y vinculacion con Google.
 *
 * <p>Reglas para {@link #iniciarSesion(String)}:</p>
 * <ol>
 *     <li>Si existe un usuario con ese {@code google_id}: inicia sesion.</li>
 *     <li>Si no, pero existe un usuario con ese correo:
 *         <ul>
 *             <li>cuenta con contrasena y sin Google: <b>no se vincula
 *                 automaticamente</b> (responde 409). El registro de la
 *                 aplicacion no verifica el correo, asi que otra persona
 *                 pudo haber creado esa cuenta con una contrasena que ella
 *                 conoce; vincular sin mas le daria acceso permanente a la
 *                 cuenta de Google del dueno real. La vinculacion se hace
 *                 estando ya autenticado ({@link #vincular}).</li>
 *             <li>cuenta con otro {@code google_id}: 409.</li>
 *         </ul></li>
 *     <li>Si no existe: se crea el usuario (sin contrasena, sin telefono).</li>
 * </ol>
 *
 * El JWT emitido es el mismo del login tradicional.
 */
@Service
public class GoogleAuthService {

    private static final String SIN_APELLIDO = "-";

    private final VerificadorTokenGoogle verificador;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    public GoogleAuthService(VerificadorTokenGoogle verificador,
                             UsuarioRepository usuarioRepository,
                             JwtService jwtService) {
        this.verificador = verificador;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    public LoginResponse iniciarSesion(String credencial) {
        IdentidadGoogle identidad = verificador.verificar(credencial);

        Usuario usuario = usuarioRepository.findByGoogleId(identidad.googleId()).orElse(null);
        if (usuario == null) {
            comprobarCorreoDisponible(identidad);
            usuario = crearUsuario(identidad);
        }

        if (!usuario.estaActivo()) {
            throw new CredencialesInvalidasException("El usuario se encuentra inactivo.");
        }

        String token = jwtService.generarToken(usuario.getIdUsuario(), usuario.getCorreo());
        return new LoginResponse(token, new UsuarioResumenResponse(
                usuario.getIdUsuario(), usuario.getNombres(), usuario.getApellidos(), usuario.getCorreo()));
    }

    /**
     * Asocia una cuenta de Google a un usuario ya autenticado. Exige que el
     * correo verificado de Google sea el mismo de la cuenta, y que esa cuenta
     * de Google no pertenezca a otro usuario.
     */
    public void vincular(Integer idUsuario, String credencial) {
        IdentidadGoogle identidad = verificador.verificar(credencial);

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new CredencialesInvalidasException("No autenticado. Inicie sesion nuevamente."));

        if (!usuario.getCorreo().equalsIgnoreCase(identidad.correo())) {
            throw new CuentaExistenteException(
                    "La cuenta de Google debe usar el mismo correo de tu cuenta de RutaLibre.");
        }
        if (usuario.getGoogleId() != null) {
            if (usuario.getGoogleId().equals(identidad.googleId())) {
                return; // ya estaba vinculada
            }
            throw new CuentaExistenteException("Tu cuenta ya esta vinculada a otra cuenta de Google.");
        }
        if (usuarioRepository.findByGoogleId(identidad.googleId()).isPresent()) {
            throw new CuentaExistenteException("Esa cuenta de Google ya esta asociada a otro usuario.");
        }

        usuario.setGoogleId(identidad.googleId());
        try {
            usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException e) {
            throw new CuentaExistenteException("Esa cuenta de Google ya esta asociada a otro usuario.");
        }
    }

    /** Rechaza (409) el alta si el correo ya pertenece a una cuenta existente. */
    private void comprobarCorreoDisponible(IdentidadGoogle identidad) {
        Optional<Usuario> existente = usuarioRepository.findByCorreoIgnoreCase(identidad.correo());
        if (existente.isEmpty()) {
            return;
        }
        if (existente.get().getGoogleId() != null) {
            // Mismo correo, distinta cuenta de Google que la ya asociada.
            throw new CuentaExistenteException("Este correo esta asociado a otra cuenta de Google.");
        }
        throw new CuentaExistenteException(
                "Ya existe una cuenta con este correo. Inicia sesion con tu correo y contrasena.");
    }

    private Usuario crearUsuario(IdentidadGoogle identidad) {
        Usuario usuario = new Usuario();
        usuario.setNombres(recortar(nombresDe(identidad), 100));
        usuario.setApellidos(recortar(apellidosDe(identidad), 100));
        usuario.setCorreo(identidad.correo());
        usuario.setGoogleId(identidad.googleId());
        usuario.setContrasenaHash(null);
        usuario.setActivo(true);

        try {
            // save confirma su propia transaccion antes de devolver el usuario.
            return usuarioRepository.save(usuario);
        } catch (DataIntegrityViolationException e) {
            // Dos primeros ingresos simultaneos: el otro ya inserto la fila.
            Optional<Usuario> concurrente = usuarioRepository.findByGoogleId(identidad.googleId());
            if (concurrente.isPresent()) {
                return concurrente.get();
            }
            if (usuarioRepository.existsByCorreoIgnoreCase(identidad.correo())) {
                throw new CuentaExistenteException(
                        "Ya existe una cuenta con este correo. Inicia sesion con tu correo y contrasena.");
            }
            throw e;
        }
    }

    private static String nombresDe(IdentidadGoogle identidad) {
        if (hay(identidad.nombres())) {
            return identidad.nombres().trim();
        }
        if (hay(identidad.nombreCompleto())) {
            return identidad.nombreCompleto().trim().split("\\s+", 2)[0];
        }
        return identidad.correo().split("@", 2)[0];
    }

    private static String apellidosDe(IdentidadGoogle identidad) {
        if (hay(identidad.apellidos())) {
            return identidad.apellidos().trim();
        }
        if (!hay(identidad.nombres()) && hay(identidad.nombreCompleto())) {
            String[] partes = identidad.nombreCompleto().trim().split("\\s+", 2);
            if (partes.length == 2) {
                return partes[1];
            }
        }
        // La columna es NOT NULL; el usuario puede completarlo despues en su perfil.
        return SIN_APELLIDO;
    }

    private static boolean hay(String valor) {
        return valor != null && !valor.isBlank();
    }

    private static String recortar(String valor, int maximo) {
        return valor.length() <= maximo ? valor : valor.substring(0, maximo);
    }
}
