package com.transportes.reclamos.servicios;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.transportes.auth.servicios.LimitadorVentana;
import com.transportes.compras.reglas.ConstructorCompras;
import com.transportes.reclamos.dto.ConstanciaReclamoDto;
import com.transportes.reclamos.dto.RegistrarReclamoRequest;
import com.transportes.reclamos.dto.RegistroReclamoRespuesta;
import com.transportes.reclamos.entidades.Reclamo;
import com.transportes.reclamos.excepciones.ReclamoException;
import com.transportes.reclamos.repositorios.CodigoReclamoRepositorio;
import com.transportes.reclamos.repositorios.FeriadoRepositorio;
import com.transportes.reclamos.repositorios.PasajeUsuarioRepositorio;
import com.transportes.reclamos.repositorios.PasajeUsuarioRepositorio.ReferenciaPasaje;
import com.transportes.reclamos.repositorios.ReclamoRepositorio;

@Service
public class ReclamoServicio {

    private static final Logger log = LoggerFactory.getLogger(ReclamoServicio.class);
    private static final String ESTADO_INICIAL = "REGISTRADO";
    private static final String MEDIO_CORREO = "CORREO";

    private final ReclamoRepositorio reclamos;
    private final CodigoReclamoRepositorio codigos;
    private final FeriadoRepositorio feriados;
    private final PasajeUsuarioRepositorio pasajes;
    private final TokenConsultaReclamo tokens;
    private final Clock reloj;
    private final TransactionTemplate transaccion;
    private final LimitadorVentana limitador;

    public ReclamoServicio(ReclamoRepositorio reclamos, CodigoReclamoRepositorio codigos,
            FeriadoRepositorio feriados, PasajeUsuarioRepositorio pasajes, TokenConsultaReclamo tokens,
            Clock relojNegocio, PlatformTransactionManager gestorTransacciones,
            @Value("${libro.max-registros-hora-ip:10}") int maximoPorHoraIp) {
        this.reclamos = reclamos;
        this.codigos = codigos;
        this.feriados = feriados;
        this.pasajes = pasajes;
        this.tokens = tokens;
        this.reloj = relojNegocio;
        this.transaccion = new TransactionTemplate(gestorTransacciones);
        this.limitador = new LimitadorVentana(maximoPorHoraIp, Duration.ofHours(1));
    }

    public RegistroReclamoRespuesta registrar(RegistrarReclamoRequest datos, Integer idUsuario, String ip) {
        String correo = NormalizadorReclamo.correo(datos.correo());

        Optional<Reclamo> previo = reclamos.findByClaveIdempotencia(datos.claveIdempotencia());
        if (previo.isPresent()) {
            return repetido(previo.get(), correo);
        }

        if (!limitador.permitir(ip == null ? "desconocida" : ip)) {
            throw ReclamoException.demasiadasSolicitudes();
        }

        LocalDate hoy = LocalDate.now(reloj);
        Reclamo nuevo = construir(datos, correo, idUsuario, hoy);

        try {
            Reclamo guardado = transaccion.execute(estado -> {
                nuevo.setCodigo(codigos.siguiente());
                return reclamos.saveAndFlush(nuevo);
            });
            return respuesta(guardado);
        } catch (DataIntegrityViolationException e) {
            Optional<Reclamo> existente = reclamos.findByClaveIdempotencia(datos.claveIdempotencia());
            if (existente.isPresent()) {
                return repetido(existente.get(), correo);
            }
            log.error("No se pudo guardar la reclamación: {}", e.getMostSpecificCause().getClass().getSimpleName());
            throw ReclamoException.noRegistrado();
        }
    }

    public ConstanciaReclamoDto consultar(String codigo, String token) {
        if (codigo == null || !tokens.esValido(codigo, token)) {
            throw ReclamoException.noEncontrado();
        }
        return reclamos.findByCodigo(codigo).map(ReclamoServicio::constancia)
                .orElseThrow(ReclamoException::noEncontrado);
    }

    private RegistroReclamoRespuesta repetido(Reclamo existente, String correo) {
        if (!existente.getCorreo().equals(correo)) {
            throw ReclamoException.conflicto("La solicitud ya fue utilizada. Recarga la página e inténtalo de nuevo.");
        }
        return respuesta(existente);
    }

    private Reclamo construir(RegistrarReclamoRequest r, String correo, Integer idUsuario, LocalDate hoy) {
        String nombres = NormalizadorReclamo.linea(r.nombresCompletos());
        String numeroDocumento = NormalizadorReclamo.documento(r.numeroDocumento());
        String telefono = NormalizadorReclamo.linea(r.telefono());
        String detalle = NormalizadorReclamo.texto(r.detalleHechos());
        String pedido = NormalizadorReclamo.texto(r.pedidoConsumidor());

        List<String> errores = NormalizadorReclamo.validar(
                r, nombres, r.tipoDocumento(), numeroDocumento, correo, telefono, detalle, pedido, hoy);
        if (!errores.isEmpty()) {
            throw ReclamoException.invalido(errores);
        }

        LocalDateTime ahora = LocalDateTime.now(reloj);
        Reclamo reclamo = new Reclamo();
        reclamo.setClaveIdempotencia(r.claveIdempotencia());
        reclamo.setFechaRegistro(ahora);
        reclamo.setFechaCreacion(ahora);
        reclamo.setFechaActualizacion(ahora);
        reclamo.setTipoRequerimiento(r.tipoRequerimiento());
        reclamo.setEstado(ESTADO_INICIAL);
        reclamo.setNombresCompletos(nombres);
        reclamo.setTipoDocumento(r.tipoDocumento());
        reclamo.setNumeroDocumento(numeroDocumento);
        reclamo.setDomicilio(NormalizadorReclamo.linea(r.domicilio()));
        reclamo.setTelefono(telefono);
        reclamo.setCorreo(correo);
        reclamo.setIdUsuario(idUsuario);
        reclamo.setServicioInvolucrado(NormalizadorReclamo.linea(r.servicioInvolucrado()));
        reclamo.setDescripcionServicio(NormalizadorReclamo.linea(r.descripcionServicio()));
        reclamo.setFechaIncidente(r.fechaIncidente());
        reclamo.setMontoReclamado(r.montoReclamado());
        reclamo.setMoneda(r.moneda() == null ? "PEN" : r.moneda());
        reclamo.setDetalleHechos(detalle);
        reclamo.setPedidoConsumidor(pedido);
        reclamo.setMedioRespuesta(MEDIO_CORREO);
        reclamo.setCorreoRespuesta(correo);
        reclamo.setDeclaracionVeracidad(r.declaracionVeracidad());
        reclamo.setAutorizaTratamientoDatos(r.autorizaTratamientoDatos());

        asignarServicio(reclamo, r, idUsuario);

        Set<LocalDate> noHabiles = feriados.entre(hoy, hoy.plusDays(90));
        LocalDate limite = CalculadoraPlazoHabil.fechaLimite(
                hoy, CalculadoraPlazoHabil.DIAS_HABILES_RESPUESTA, noHabiles);
        if (!feriados.hayFeriadosEnAnio(limite.getYear())) {
            log.warn("La tabla feriado no tiene datos para {}: el plazo se calculó solo con fines de semana.",
                    limite.getYear());
        }
        reclamo.setFechaLimiteRespuesta(limite);
        return reclamo;
    }

    private void asignarServicio(Reclamo reclamo, RegistrarReclamoRequest r, Integer idUsuario) {
        if (r.idPasaje() == null) {
            reclamo.setCodigoViaje(NormalizadorReclamo.linea(r.codigoViaje()));
            reclamo.setOrigen(NormalizadorReclamo.linea(r.origen()));
            reclamo.setDestino(NormalizadorReclamo.linea(r.destino()));
            reclamo.setFechaServicio(r.fechaServicio());
            reclamo.setNumeroAsiento(NormalizadorReclamo.linea(r.numeroAsiento()));
            return;
        }
        if (idUsuario == null) {
            throw ReclamoException.invalido("Inicia sesión para asociar un pasaje de tu cuenta.");
        }
        ReferenciaPasaje pasaje = pasajes.buscar(idUsuario, r.idPasaje())
                .orElseThrow(() -> ReclamoException.invalido("No encontramos ese pasaje en tu cuenta."));
        reclamo.setIdPasaje(pasaje.idPasaje());
        reclamo.setCodigoPasaje(ConstructorCompras.numeroBoleto(pasaje.idPasaje()));
        reclamo.setIdViaje(pasaje.idViaje());
        reclamo.setCodigoViaje(pasaje.idViaje() == null ? null : String.valueOf(pasaje.idViaje()));
        reclamo.setOrigen(pasaje.origen());
        reclamo.setDestino(pasaje.destino());
        reclamo.setFechaServicio(pasaje.fechaSalida());
        reclamo.setNumeroAsiento(pasaje.numeroAsiento());
    }

    private RegistroReclamoRespuesta respuesta(Reclamo reclamo) {
        return new RegistroReclamoRespuesta(tokens.generar(reclamo.getCodigo()), constancia(reclamo));
    }

    private static ConstanciaReclamoDto constancia(Reclamo r) {
        return new ConstanciaReclamoDto(
                r.getCodigo(), r.getFechaRegistro(), r.getFechaLimiteRespuesta(),
                CalculadoraPlazoHabil.DIAS_HABILES_RESPUESTA, r.getTipoRequerimiento(), r.getEstado(),
                new ConstanciaReclamoDto.Consumidor(r.getNombresCompletos(), r.getTipoDocumento(),
                        r.getNumeroDocumento(), r.getDomicilio(), r.getTelefono(), r.getCorreo()),
                new ConstanciaReclamoDto.Servicio(r.getServicioInvolucrado(), r.getCodigoPasaje(),
                        r.getCodigoViaje(), r.getFechaServicio(), r.getOrigen(), r.getDestino(),
                        r.getNumeroAsiento()),
                new ConstanciaReclamoDto.Requerimiento(r.getDescripcionServicio(), r.getFechaIncidente(),
                        r.getMontoReclamado(), r.getMoneda(), r.getDetalleHechos(), r.getPedidoConsumidor()),
                new ConstanciaReclamoDto.Comunicacion(r.getMedioRespuesta(), r.getCorreoRespuesta()));
    }
}
