package com.transportes.pagos.servicios;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.transportes.buses.dto.AsientoFisicoDTO;
import com.transportes.buses.servicios.AsientoServicio;
import com.transportes.pagos.configuracion.CredencialesCulqi;
import com.transportes.pagos.configuracion.PropiedadesPago;
import com.transportes.pagos.culqi.Autenticacion3ds;
import com.transportes.pagos.culqi.CargoCulqi;
import com.transportes.pagos.culqi.ClienteCulqi;
import com.transportes.pagos.culqi.ErrorCulqiException;
import com.transportes.pagos.culqi.SolicitudCargo;
import com.transportes.pagos.dto.Confirmar3dsRequest;
import com.transportes.pagos.dto.ConfiguracionPagoResponse;
import com.transportes.pagos.dto.EstadoPagoResponse;
import com.transportes.pagos.dto.EstadoPagoResponse.CompraConfirmada;
import com.transportes.pagos.dto.EstadoPagoResponse.PasajeConfirmado;
import com.transportes.pagos.dto.EstadoPagoResponse.SesionRenovada;
import com.transportes.pagos.dto.IniciarPagoRequest;
import com.transportes.pagos.entidades.EstadoOperacion;
import com.transportes.pagos.entidades.OperacionPago;
import com.transportes.pagos.entidades.Pasaje;
import com.transportes.pagos.entidades.Venta;
import com.transportes.pagos.excepciones.PagoException;
import com.transportes.pagos.repositorios.OperacionPagoRepositorio;
import com.transportes.pagos.repositorios.PasajeRepositorio;
import com.transportes.pagos.repositorios.VentaRepositorio;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import com.transportes.viajes.dto.PasajeroAsientoRequest;
import com.transportes.viajes.entidades.Pasajero;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.excepciones.AsientoNoDisponibleException;
import com.transportes.viajes.repositorios.PasajeroRepositorio;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.PasajerosSesionCache;
import com.transportes.viajes.servicios.TokenSesionServicio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;
import com.transportes.viajes.servicios.ValidadorReservaViaje;
import com.transportes.viajes.servicios.ViajeAsientoServicio;

@Service
public class PagoServicio {

    private static final Logger log = LoggerFactory.getLogger(PagoServicio.class);

    static final Set<EstadoOperacion> ACTIVOS =
            EnumSet.of(EstadoOperacion.CREANDO, EstadoOperacion.EN_PROCESO, EstadoOperacion.ACCION_REQUERIDA);
    private static final String ESTADO_BLOQUEADO = "BLOQUEADO_TEMPORAL";
    private static final String DESCRIPCION = "RutaLibre - pasajes de bus";
    private static final String MOTIVO_REEMBOLSO = "solicitud_comprador";
    private static final String MONEDA = "PEN";

    private final OperacionPagoRepositorio operaciones;
    private final ViajeAsientoRepositorio viajeAsientoRepositorio;
    private final ViajeAsientoServicio viajeAsientoServicio;
    private final TokenSesionServicio tokenSesionServicio;
    private final PasajerosSesionCache pasajerosCache;
    private final RegistroCompraServicio registroCompra;
    private final DatosPasajerosJson datosPasajerosJson;
    private final ClienteCulqi culqi;
    private final CredencialesCulqi credenciales;
    private final PropiedadesPago propiedades;
    private final VentaRepositorio ventaRepositorio;
    private final PasajeRepositorio pasajeRepositorio;
    private final PasajeroRepositorio pasajeroRepositorio;
    private final UsuarioRepository usuarioRepositorio;
    private final AsientoServicio asientoServicio;
    private final ValidadorReservaViaje validadorReserva;
    private final TransactionTemplate tx;

    public PagoServicio(OperacionPagoRepositorio operaciones, ViajeAsientoRepositorio viajeAsientoRepositorio,
                        ViajeAsientoServicio viajeAsientoServicio, TokenSesionServicio tokenSesionServicio,
                        PasajerosSesionCache pasajerosCache, RegistroCompraServicio registroCompra,
                        DatosPasajerosJson datosPasajerosJson, ClienteCulqi culqi, CredencialesCulqi credenciales,
                        PropiedadesPago propiedades, VentaRepositorio ventaRepositorio,
                        PasajeRepositorio pasajeRepositorio, PasajeroRepositorio pasajeroRepositorio,
                        UsuarioRepository usuarioRepositorio, AsientoServicio asientoServicio,
                        ValidadorReservaViaje validadorReserva, PlatformTransactionManager transactionManager) {
        this.operaciones = operaciones;
        this.viajeAsientoRepositorio = viajeAsientoRepositorio;
        this.viajeAsientoServicio = viajeAsientoServicio;
        this.tokenSesionServicio = tokenSesionServicio;
        this.pasajerosCache = pasajerosCache;
        this.registroCompra = registroCompra;
        this.datosPasajerosJson = datosPasajerosJson;
        this.culqi = culqi;
        this.credenciales = credenciales;
        this.propiedades = propiedades;
        this.ventaRepositorio = ventaRepositorio;
        this.pasajeRepositorio = pasajeRepositorio;
        this.pasajeroRepositorio = pasajeroRepositorio;
        this.usuarioRepositorio = usuarioRepositorio;
        this.asientoServicio = asientoServicio;
        this.validadorReserva = validadorReserva;
        this.tx = new TransactionTemplate(transactionManager);
    }

    private record Preparacion(OperacionPago operacion, boolean nueva, List<PasajeroAsientoRequest> pasajeros) {
    }

    public ConfiguracionPagoResponse configuracion() {
        boolean disponible = credenciales.disponible();
        return new ConfiguracionPagoResponse(disponible, credenciales.entorno().name(),
                disponible ? credenciales.llavePublica() : null, MONEDA, propiedades.getVersionTerminos());
    }

    public EstadoPagoResponse iniciar(Integer idUsuario, IniciarPagoRequest req) {
        exigirDisponible();

        Optional<OperacionPago> repetida = operaciones.findByClaveIdempotencia(req.claveIdempotencia());
        if (repetida.isPresent()) {
            return respuestaDeExistente(repetida.get(), idUsuario);
        }

        SesionReserva sesion = tokenSesionServicio.validar(req.tokenSesion(), req.idViaje());
        validadorReserva.exigirReservable(req.idViaje());
        try {
            registroCompra.idMetodoPago(req.medioPago());
        } catch (IllegalStateException e) {
            log.error("Configuración incompleta: {}", e.getMessage());
            throw new PagoException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Los pagos no están disponibles en este momento. Inténtalo más tarde.");
        }

        Preparacion prep;
        try {
            prep = tx.execute(estado -> preparar(idUsuario, req, sesion));
        } catch (DataIntegrityViolationException e) {
            return operaciones.findByClaveIdempotencia(req.claveIdempotencia())
                    .map(op -> respuestaDeExistente(op, idUsuario))
                    .orElseThrow(() -> new PagoException(HttpStatus.CONFLICT,
                            "Ya hay un pago en curso para esta reserva."));
        }
        OperacionPago op = prep.operacion();
        if (!prep.nueva()) {
            return respuestaDeExistente(op, idUsuario);
        }

        pasajerosCache.guardar(op.getIdSesionReserva(), op.getFechaExpiracion(), prep.pasajeros());
        SesionReserva renovada = tokenSesionServicio.reemitir(op.getIdSesionReserva(), op.getIdViaje(),
                op.getFechaExpiracion());

        cobrar(op.getIdOperacionPago(), construirSolicitud(op, req.token(), null));
        return respuesta(op.getIdOperacionPago(), renovada);
    }

    public EstadoPagoResponse confirmar3ds(Integer idUsuario, String referencia, Confirmar3dsRequest req) {
        OperacionPago op = operaciones.findByReferenciaExterna(referencia)
                .filter(o -> o.getIdUsuario().equals(idUsuario))
                .orElseThrow(() -> new PagoException(HttpStatus.NOT_FOUND, "No encontramos esa operación de pago."));
        exigirDisponible();

        Boolean tomada = tx.execute(estado -> operaciones.bloquearPorId(op.getIdOperacionPago()).map(actual -> {
            if (actual.getEstado() != EstadoOperacion.ACCION_REQUERIDA
                    || !actual.getFechaExpiracion().isAfter(LocalDateTime.now())) {
                return false;
            }
            actual.setEstado(EstadoOperacion.CREANDO);
            actual.setMensaje(MensajesPago.VERIFICANDO);
            actual.setFechaActualizacion(LocalDateTime.now());
            return true;
        }).orElse(false));
        if (!Boolean.TRUE.equals(tomada)) {
            return respuesta(op.getIdOperacionPago(), null);
        }

        var p = req.parametros();
        Autenticacion3ds autenticacion = new Autenticacion3ds(p.eci(), p.xid(), p.cavv(), p.protocolVersion(),
                p.directoryServerTransactionId());
        cobrar(op.getIdOperacionPago(), construirSolicitud(op, req.token(), autenticacion));
        return respuesta(op.getIdOperacionPago(), null);
    }

    private void exigirDisponible() {
        if (!credenciales.disponible()) {
            log.error("Pago rechazado: las llaves de Culqi no están configuradas correctamente en el backend");
            throw new PagoException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Los pagos no están disponibles en este momento. Inténtalo más tarde.");
        }
    }

    private Preparacion preparar(Integer idUsuario, IniciarPagoRequest req, SesionReserva sesion) {
        String idSesion = sesion.idSesion();
        viajeAsientoRepositorio.bloquearSesion("pago:" + idSesion);

        Optional<OperacionPago> repetida = operaciones.findByClaveIdempotencia(req.claveIdempotencia());
        if (repetida.isPresent()) {
            return new Preparacion(repetida.get(), false, List.of());
        }
        List<OperacionPago> activas = operaciones.findByIdSesionReservaAndEstadoIn(idSesion, ACTIVOS);
        if (!activas.isEmpty()) {
            return new Preparacion(activas.get(0), false, List.of());
        }

        LocalDateTime ahora = LocalDateTime.now();
        Integer idViajeInt = Math.toIntExact(req.idViaje());
        List<ViajeAsiento> asientos = viajeAsientoRepositorio
                .findByIdViajeAndTokenBloqueoAndEstadoViajeAsiento(idViajeInt, idSesion, ESTADO_BLOQUEADO).stream()
                .filter(va -> va.getFechaExpiracionBloqueo() != null && !va.getFechaExpiracionBloqueo().isBefore(ahora))
                .toList();
        if (asientos.isEmpty()) {
            throw new PagoException(HttpStatus.CONFLICT,
                    "Tu reserva de asientos expiró. Vuelve a seleccionar tus asientos.");
        }
        List<PasajeroAsientoRequest> pasajeros = pasajerosCache.obtener(idSesion)
                .orElseThrow(() -> new PagoException(HttpStatus.CONFLICT,
                        "Los datos de los pasajeros vencieron. Vuelve a confirmarlos para continuar al pago."));
        Set<Integer> idsAsientos = asientos.stream().map(ViajeAsiento::getIdAsiento).collect(Collectors.toCollection(TreeSet::new));
        Set<Integer> idsPasajeros = pasajeros.stream().map(PasajeroAsientoRequest::idAsiento).collect(Collectors.toCollection(TreeSet::new));
        if (!idsAsientos.equals(idsPasajeros) || pasajeros.size() != asientos.size()) {
            throw new PagoException(HttpStatus.CONFLICT,
                    "Tus asientos cambiaron. Vuelve a confirmar los datos de los pasajeros.");
        }

        BigDecimal monto = asientos.stream().map(ViajeAsiento::getPrecio)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        if (monto.signum() <= 0) {
            throw new PagoException(HttpStatus.CONFLICT, "El importe de la reserva no es válido.");
        }
        if ("YAPE".equals(req.medioPago()) && monto.compareTo(propiedades.getTopeYape()) > 0) {
            throw new PagoException(HttpStatus.BAD_REQUEST,
                    "El total supera el tope de Yape. Usa una tarjeta o reduce la cantidad de pasajes.");
        }
        if ("YAPE".equals(req.medioPago()) != req.token().startsWith("ype_")) {
            throw new PagoException(HttpStatus.BAD_REQUEST, "El token de pago no corresponde al medio elegido.");
        }

        LocalDateTime expiracion = ahora.plusMinutes(propiedades.getMinutosPago());
        viajeAsientoServicio.extenderBloqueoSesion(req.idViaje(), idSesion, expiracion);

        OperacionPago op = new OperacionPago();
        op.setReferenciaExterna("RL-" + UUID.randomUUID());
        op.setClaveIdempotencia(req.claveIdempotencia());
        op.setIdViaje(req.idViaje());
        op.setIdSesionReserva(idSesion);
        op.setIdUsuario(idUsuario);
        op.setMedioPago(req.medioPago());
        op.setEntorno(credenciales.entorno());
        op.setMonto(monto);
        op.setMoneda(MONEDA);
        op.setEstado(EstadoOperacion.CREANDO);
        op.setEmailPagador(req.emailPagador().trim());
        op.setTerminosAceptadosEn(ahora);
        op.setTerminosVersion(propiedades.getVersionTerminos());
        op.setDatosPasajeros(datosPasajerosJson.escribir(pasajeros));
        op.setFechaExpiracion(expiracion);
        op.setFechaCreacion(ahora);
        op.setFechaActualizacion(ahora);
        op = operaciones.saveAndFlush(op);
        log.info("Operación de pago creada: referencia={}, entorno={}, viaje={}, asientos={}, monto={}, medio={}",
                op.getReferenciaExterna(), op.getEntorno(), req.idViaje(), asientos.size(), monto, req.medioPago());
        return new Preparacion(op, true, pasajeros);
    }

    SolicitudCargo construirSolicitud(OperacionPago op, String token, Autenticacion3ds autenticacion) {
        Usuario comprador = usuarioRepositorio.findById(op.getIdUsuario()).orElse(null);
        String nombre = comprador == null ? null : textoOpcional(comprador.getNombres());
        String apellido = comprador == null ? null : textoOpcional(comprador.getApellidos());
        String telefono = comprador == null || comprador.getNroTelefono() == null ? null
                : comprador.getNroTelefono().replaceAll("\\D", "");
        return new SolicitudCargo(op.getReferenciaExterna(), op.getMonto(), op.getMoneda(), DESCRIPCION,
                op.getEmailPagador(), token, nombre, apellido, telefono, autenticacion);
    }

    private static String textoOpcional(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        String limpio = valor.strip();
        return limpio.length() <= 50 ? limpio : limpio.substring(0, 50);
    }

    private void cobrar(Integer idOperacion, SolicitudCargo solicitud) {
        try {
            aplicarCargo(idOperacion, culqi.crearCargo(solicitud));
        } catch (ErrorCulqiException e) {
            switch (e.getTipo()) {
                case PAGO_RECHAZADO -> cerrarSinCargo(idOperacion, EstadoOperacion.RECHAZADO,
                        MensajesPago.rechazo(e.getCodigo(), e.getMensajeUsuario()), e.getIdCargo());
                case SOLICITUD_INVALIDA, NO_CONFIGURADO, NO_ENCONTRADO -> {
                    log.error("Cargo rechazado por Culqi: operacion={}, monto={} PEN, http={}, codigo={}, detalle={}",
                            solicitud.referenciaExterna(), solicitud.monto(), e.getEstadoHttp(), e.getCodigo(),
                            e.getDetalle());
                    cerrarSinCargo(idOperacion, EstadoOperacion.ERROR, MensajesPago.ERROR_DATOS, null);
                }
                case RESULTADO_DESCONOCIDO -> {
                    log.warn("Resultado desconocido al crear el cargo de {}; se verificará",
                            solicitud.referenciaExterna());
                    tx.executeWithoutResult(t -> operaciones.bloquearPorId(idOperacion).ifPresent(o -> {
                        o.setMensaje(MensajesPago.VERIFICANDO);
                        o.setFechaActualizacion(LocalDateTime.now());
                    }));
                }
            }
        }
    }

    public void aplicarCargo(Integer idOperacion, CargoCulqi cargo) {
        boolean reembolsar;
        try {
            reembolsar = Boolean.TRUE.equals(tx.execute(estado -> aplicarEnTransaccion(idOperacion, cargo)));
        } catch (AsientoNoDisponibleException | CompraNoRegistrableException e) {
            log.error("Pago aprobado sin poder registrar la compra (operación {}): {}", idOperacion, e.getMessage());
            reembolsar = Boolean.TRUE.equals(tx.execute(estado -> marcarSinAsientos(idOperacion, cargo)));
        }
        if (reembolsar) {
            intentarReembolso(idOperacion);
        }
    }

    private boolean aplicarEnTransaccion(Integer idOperacion, CargoCulqi cargo) {
        OperacionPago op = operaciones.bloquearPorId(idOperacion)
                .orElseThrow(() -> new IllegalStateException("Operación inexistente " + idOperacion));
        LocalDateTime ahora = LocalDateTime.now();
        op.setFechaUltimaConsulta(ahora);
        op.setFechaActualizacion(ahora);

        if (cargo.requiere3ds()) {
            if (op.getEstado().esActivo() && op.getCulqiChargeId() == null) {
                op.setEstado(EstadoOperacion.ACCION_REQUERIDA);
                op.setMensaje(MensajesPago.AUTENTICACION_3DS);
            }
            return false;
        }
        if (cargo.referenciaExterna() != null && !op.getReferenciaExterna().equals(cargo.referenciaExterna())) {
            log.error("El cargo {} no corresponde a la operación {}", cargo.id(), op.getReferenciaExterna());
            return false;
        }
        if (op.getCulqiChargeId() == null) {
            op.setCulqiChargeId(cargo.id());
        } else if (!op.getCulqiChargeId().equals(cargo.id())) {
            log.error("La operación {} ya está asociada a otro cargo", op.getReferenciaExterna());
            return false;
        }
        op.setCulqiEstado(recortar(cargo.tipoResultado(), 40));
        op.setCulqiCodigo(recortar(cargo.codigo(), 60));

        switch (op.getEstado()) {
            case APROBADO -> {
                if (cargo.reembolsadaTotalmente()) {
                    log.warn("El cargo {} de una compra ya registrada figura reembolsado: revisar manualmente",
                            cargo.id());
                }
                return false;
            }
            case APROBADO_SIN_ASIENTOS, REEMBOLSADO -> {
                return false;
            }
            default -> {
            }
        }

        if (cargo.aprobada()) {
            try {
                RegistroCompraServicio.verificarCorrespondencia(op, cargo);
            } catch (IllegalStateException e) {
                throw new CompraNoRegistrableException(e.getMessage());
            }
            registroCompra.registrar(op, cargo);
            op.setMensaje(MensajesPago.APROBADO);
            pasajerosCache.eliminar(op.getIdSesionReserva());
            return false;
        }
        if (!op.getEstado().esActivo()) {
            return false;
        }
        if (cargo.rechazada()) {
            op.setEstado(EstadoOperacion.RECHAZADO);
            op.setMensaje(MensajesPago.rechazo(cargo.codigo(), cargo.mensajeUsuario()));
            log.info("Pago no aprobado: operacion={}, cargo={}, resultado={}, codigo={}", op.getReferenciaExterna(),
                    cargo.id(), cargo.tipoResultado(), cargo.codigo());
        } else {
            op.setEstado(EstadoOperacion.EN_PROCESO);
            op.setMensaje(MensajesPago.EN_PROCESO);
        }
        return false;
    }

    private boolean marcarSinAsientos(Integer idOperacion, CargoCulqi cargo) {
        OperacionPago op = operaciones.bloquearPorId(idOperacion).orElseThrow();
        if (op.getEstado() == EstadoOperacion.APROBADO || op.getIdVenta() != null) {
            return false;
        }
        if (op.getCulqiChargeId() == null) {
            op.setCulqiChargeId(cargo.id());
        }
        op.setCulqiEstado(recortar(cargo.tipoResultado(), 40));
        op.setCulqiCodigo(recortar(cargo.codigo(), 60));
        op.setEstado(EstadoOperacion.APROBADO_SIN_ASIENTOS);
        op.setMensaje(MensajesPago.SIN_ASIENTOS);
        op.setDatosPasajeros(null);
        op.setFechaActualizacion(LocalDateTime.now());
        return true;
    }

    private void cerrarSinCargo(Integer idOperacion, EstadoOperacion estado, String mensaje, String idCargo) {
        tx.executeWithoutResult(t -> operaciones.bloquearPorId(idOperacion).ifPresent(op -> {
            if (op.getEstado().esActivo()) {
                op.setEstado(estado);
                op.setMensaje(mensaje);
                if (idCargo != null && op.getCulqiChargeId() == null) {
                    op.setCulqiChargeId(recortar(idCargo, 64));
                }
                op.setFechaActualizacion(LocalDateTime.now());
            }
        }));
    }

    void intentarReembolso(Integer idOperacion) {
        OperacionPago op = operaciones.findById(idOperacion).orElse(null);
        if (op == null || op.getEstado() != EstadoOperacion.APROBADO_SIN_ASIENTOS || op.getCulqiChargeId() == null) {
            return;
        }
        try {
            String idReembolso = culqi.reembolsar(op.getCulqiChargeId(), op.getMonto(), MOTIVO_REEMBOLSO);
            tx.executeWithoutResult(t -> operaciones.bloquearPorId(idOperacion).ifPresent(o -> {
                if (o.getEstado() == EstadoOperacion.APROBADO_SIN_ASIENTOS) {
                    o.setEstado(EstadoOperacion.REEMBOLSADO);
                    o.setCulqiRefundId(recortar(idReembolso, 64));
                    o.setMensaje(MensajesPago.REEMBOLSADO);
                    o.setFechaActualizacion(LocalDateTime.now());
                }
            }));
            log.info("Devolución solicitada: operacion={}, cargo={}", op.getReferenciaExterna(), op.getCulqiChargeId());
        } catch (ErrorCulqiException e) {
            log.error("No se pudo devolver el cargo {} ({}); se reintentará", op.getCulqiChargeId(), e.getTipo());
        }
    }

    public void sincronizar(Integer idOperacion) {
        OperacionPago op = operaciones.findById(idOperacion).orElse(null);
        if (op == null) {
            return;
        }
        if (op.getEstado() == EstadoOperacion.APROBADO_SIN_ASIENTOS) {
            intentarReembolso(idOperacion);
            return;
        }
        if (!op.getEstado().esActivo()) {
            return;
        }
        boolean esperaAutenticacion = op.getEstado() == EstadoOperacion.ACCION_REQUERIDA
                && op.getCulqiChargeId() == null;
        if (!esperaAutenticacion) {
            try {
                if (op.getCulqiChargeId() != null) {
                    aplicarCargo(idOperacion, culqi.consultarCargo(op.getCulqiChargeId()));
                } else {
                    OffsetDateTime creada = op.getFechaCreacion().atZone(ZoneId.systemDefault()).toOffsetDateTime();
                    Optional<CargoCulqi> encontrado = culqi.buscarPorReferencia(op.getReferenciaExterna(),
                            op.getEmailPagador(), creada.minusMinutes(5), OffsetDateTime.now().plusMinutes(5));
                    if (encontrado.isPresent()) {
                        aplicarCargo(idOperacion, encontrado.get());
                    } else if (op.getFechaCreacion().isBefore(
                            LocalDateTime.now().minusSeconds(propiedades.getSegundosResultadoDesconocido()))) {
                        log.warn("El cargo de {} no existe en Culqi: se cierra sin cobro", op.getReferenciaExterna());
                        cerrarSinCargo(idOperacion, EstadoOperacion.ERROR, MensajesPago.ERROR_CREACION, null);
                    } else {
                        marcarConsultada(idOperacion);
                    }
                }
            } catch (ErrorCulqiException e) {
                log.warn("No se pudo consultar la operación {} en Culqi ({})", op.getReferenciaExterna(), e.getTipo());
                marcarConsultada(idOperacion);
            }
        }
        expirarSiCorresponde(idOperacion);
    }

    private void expirarSiCorresponde(Integer idOperacion) {
        OperacionPago op = operaciones.findById(idOperacion).orElse(null);
        if (op == null || !op.getEstado().esActivo() || !op.getFechaExpiracion().isBefore(LocalDateTime.now())) {
            return;
        }
        if (op.getCulqiChargeId() == null) {
            cerrarSinCargo(idOperacion, EstadoOperacion.EXPIRADO, MensajesPago.EXPIRADO, null);
        }
    }

    private void marcarConsultada(Integer idOperacion) {
        tx.executeWithoutResult(t -> operaciones.bloquearPorId(idOperacion)
                .ifPresent(o -> o.setFechaUltimaConsulta(LocalDateTime.now())));
    }

    public EstadoPagoResponse consultar(Integer idUsuario, String referencia) {
        OperacionPago op = operaciones.findByReferenciaExterna(referencia)
                .filter(o -> o.getIdUsuario().equals(idUsuario))
                .orElseThrow(() -> new PagoException(HttpStatus.NOT_FOUND, "No encontramos esa operación de pago."));
        boolean pendiente = op.getEstado().esActivo() || op.getEstado() == EstadoOperacion.APROBADO_SIN_ASIENTOS;
        boolean toca = op.getFechaUltimaConsulta() == null || op.getFechaUltimaConsulta()
                .isBefore(LocalDateTime.now().minusSeconds(propiedades.getSegundosEntreConsultas()));
        if (pendiente && toca) {
            sincronizar(op.getIdOperacionPago());
        }
        return respuesta(op.getIdOperacionPago(), null);
    }

    private EstadoPagoResponse respuestaDeExistente(OperacionPago op, Integer idUsuario) {
        if (!op.getIdUsuario().equals(idUsuario)) {
            throw new PagoException(HttpStatus.CONFLICT, "La solicitud de pago no es válida.");
        }
        return respuesta(op.getIdOperacionPago(), null);
    }

    EstadoPagoResponse respuesta(Integer idOperacion, SesionReserva renovada) {
        return tx.execute(estado -> {
            OperacionPago op = operaciones.findById(idOperacion).orElseThrow();
            EstadoOperacion e = op.getEstado();
            boolean reintentable = (e == EstadoOperacion.RECHAZADO || e == EstadoOperacion.ERROR)
                    && op.getFechaExpiracion().isAfter(LocalDateTime.now());
            String mensaje = op.getMensaje() != null ? op.getMensaje()
                    : e == EstadoOperacion.CREANDO ? MensajesPago.VERIFICANDO : null;
            SesionRenovada sesion = renovada == null ? null
                    : new SesionRenovada(renovada.tokenSesion(), renovada.segundosRestantes());
            return new EstadoPagoResponse(op.getReferenciaExterna(), e.name(), e.esFinal(), reintentable, mensaje,
                    op.getCulqiChargeId(), op.getMonto(), e == EstadoOperacion.ACCION_REQUERIDA,
                    sesion, e == EstadoOperacion.APROBADO ? compra(op) : null, op.getEntorno().name());
        });
    }

    private CompraConfirmada compra(OperacionPago op) {
        Venta venta = ventaRepositorio.findById(op.getIdVenta()).orElseThrow();
        List<PasajeConfirmado> pasajes = pasajeRepositorio.findByIdVentaOrderByIdPasaje(venta.getIdVenta()).stream()
                .map(this::detallePasaje).toList();
        return new CompraConfirmada(venta.getIdVenta(), venta.getFechaVenta(), venta.getMontoTotal(),
                op.getCulqiChargeId(), pasajes);
    }

    private PasajeConfirmado detallePasaje(Pasaje p) {
        ViajeAsiento va = viajeAsientoRepositorio.findById(p.getIdViajeAsiento()).orElse(null);
        AsientoFisicoDTO fisico = va == null ? null : asientoServicio.obtenerPorId(va.getIdAsiento());
        Pasajero pasajero = pasajeroRepositorio.findById(p.getIdPasajero()).orElse(null);
        String nombre = pasajero == null ? "" : (pasajero.getNombres() + " " + pasajero.getApellidos()).trim();
        String documento = pasajero == null ? "" : pasajero.getTipoDocumento() + " " + enmascarar(pasajero.getNumeroDocumento());
        return new PasajeConfirmado(p.getIdPasaje(), fisico == null ? "-" : fisico.numero(),
                fisico == null ? 1 : fisico.piso(), nombre, documento, p.getPrecio());
    }

    static String enmascarar(String documento) {
        if (documento == null || documento.length() <= 4) {
            return "****";
        }
        return "*".repeat(documento.length() - 4) + documento.substring(documento.length() - 4);
    }

    private static String recortar(String valor, int maximo) {
        return valor == null || valor.length() <= maximo ? valor : valor.substring(0, maximo);
    }

    /** Pago aprobado que no puede convertirse en compra (el monto o la referencia no coinciden). */
    static class CompraNoRegistrableException extends RuntimeException {
        CompraNoRegistrableException(String mensaje) {
            super(mensaje);
        }
    }
}
