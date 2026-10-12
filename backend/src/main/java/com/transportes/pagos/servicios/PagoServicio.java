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
import com.transportes.pagos.configuracion.PropiedadesPago;
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
import com.transportes.pagos.mercadopago.ClienteMercadoPago;
import com.transportes.pagos.mercadopago.ErrorMercadoPagoException;
import com.transportes.pagos.mercadopago.OrdenMercadoPago;
import com.transportes.pagos.mercadopago.SolicitudOrden;
import com.transportes.pagos.repositorios.OperacionPagoRepositorio;
import com.transportes.pagos.repositorios.PagoRepositorio;
import com.transportes.pagos.repositorios.PasajeRepositorio;
import com.transportes.pagos.repositorios.VentaRepositorio;
import com.transportes.viajes.dto.PasajeroAsientoRequest;
import com.transportes.viajes.entidades.Pasajero;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.excepciones.AsientoNoDisponibleException;
import com.transportes.viajes.repositorios.PasajeroRepositorio;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.PasajerosSesionCache;
import com.transportes.viajes.servicios.TokenSesionServicio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;
import com.transportes.viajes.servicios.ViajeAsientoServicio;

/**
 * Flujo de pago con Mercado Pago (Checkout API vía Orders).
 *
 * <ol>
 *   <li>{@link #iniciar}: valida la sesión de reserva, calcula el importe en el servidor, registra una operación
 *       PENDIENTE (sin venta), extiende el bloqueo de los asientos y crea la order con X-Idempotency-Key.</li>
 *   <li>{@link #aplicarOrden}: único punto que interpreta el estado de una order consultada en Mercado Pago. Lo usan
 *       la respuesta de creación, el Webhook, la consulta del frontend y el job de conciliación. Es idempotente y
 *       serializado con un bloqueo de fila: repetir una notificación nunca duplica la compra.</li>
 *   <li>Solo con {@code processed/accredited} se registra la compra ({@link RegistroCompraServicio}).</li>
 * </ol>
 */
@Service
public class PagoServicio {

    private static final Logger log = LoggerFactory.getLogger(PagoServicio.class);

    static final Set<EstadoOperacion> ACTIVOS =
            EnumSet.of(EstadoOperacion.CREANDO, EstadoOperacion.EN_PROCESO, EstadoOperacion.ACCION_REQUERIDA);
    private static final Set<String> TIPOS_TARJETA = Set.of("credit_card", "debit_card", "prepaid_card");
    private static final Set<String> DOCUMENTOS_MP = Set.of("DNI", "C.E", "RUC", "Otro");
    private static final String ESTADO_BLOQUEADO = "BLOQUEADO_TEMPORAL";

    private final OperacionPagoRepositorio operaciones;
    private final ViajeAsientoRepositorio viajeAsientoRepositorio;
    private final ViajeAsientoServicio viajeAsientoServicio;
    private final TokenSesionServicio tokenSesionServicio;
    private final PasajerosSesionCache pasajerosCache;
    private final RegistroCompraServicio registroCompra;
    private final DatosPasajerosJson datosPasajerosJson;
    private final ClienteMercadoPago mercadoPago;
    private final PropiedadesPago propiedades;
    private final VentaRepositorio ventaRepositorio;
    private final PasajeRepositorio pasajeRepositorio;
    private final PagoRepositorio pagoRepositorio;
    private final PasajeroRepositorio pasajeroRepositorio;
    private final AsientoServicio asientoServicio;
    private final TransactionTemplate tx;

    public PagoServicio(OperacionPagoRepositorio operaciones, ViajeAsientoRepositorio viajeAsientoRepositorio,
                        ViajeAsientoServicio viajeAsientoServicio, TokenSesionServicio tokenSesionServicio,
                        PasajerosSesionCache pasajerosCache, RegistroCompraServicio registroCompra,
                        DatosPasajerosJson datosPasajerosJson, ClienteMercadoPago mercadoPago,
                        PropiedadesPago propiedades, VentaRepositorio ventaRepositorio,
                        PasajeRepositorio pasajeRepositorio, PagoRepositorio pagoRepositorio,
                        PasajeroRepositorio pasajeroRepositorio, AsientoServicio asientoServicio,
                        PlatformTransactionManager transactionManager) {
        this.operaciones = operaciones;
        this.viajeAsientoRepositorio = viajeAsientoRepositorio;
        this.viajeAsientoServicio = viajeAsientoServicio;
        this.tokenSesionServicio = tokenSesionServicio;
        this.pasajerosCache = pasajerosCache;
        this.registroCompra = registroCompra;
        this.datosPasajerosJson = datosPasajerosJson;
        this.mercadoPago = mercadoPago;
        this.propiedades = propiedades;
        this.ventaRepositorio = ventaRepositorio;
        this.pasajeRepositorio = pasajeRepositorio;
        this.pagoRepositorio = pagoRepositorio;
        this.pasajeroRepositorio = pasajeroRepositorio;
        this.asientoServicio = asientoServicio;
        this.tx = new TransactionTemplate(transactionManager);
    }

    // =====================================================================================================
    // 1. Iniciar el pago
    // =====================================================================================================

    private record Preparacion(OperacionPago operacion, boolean nueva, List<PasajeroAsientoRequest> pasajeros) {
    }

    public EstadoPagoResponse iniciar(Integer idUsuario, IniciarPagoRequest req) {
        if (!mercadoPago.configurado()) {
            log.error("Pago rechazado: falta MERCADOPAGO_ACCESS_TOKEN en el backend");
            throw new PagoException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Los pagos no están disponibles en este momento. Inténtalo más tarde.");
        }
        validarDatosDelMedio(req);

        // Reintento del MISMO intento (doble clic, timeout del navegador): se devuelve la operación existente.
        Optional<OperacionPago> repetida = operaciones.findByClaveIdempotencia(req.claveIdempotencia());
        if (repetida.isPresent()) {
            return respuestaDeExistente(repetida.get(), idUsuario);
        }

        SesionReserva sesion = tokenSesionServicio.validar(req.tokenSesion(), req.idViaje());
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
            // Carrera entre dos solicitudes idénticas: la otra ya registró la operación.
            return operaciones.findByClaveIdempotencia(req.claveIdempotencia())
                    .map(op -> respuestaDeExistente(op, idUsuario))
                    .orElseThrow(() -> new PagoException(HttpStatus.CONFLICT,
                            "Ya hay un pago en curso para esta reserva."));
        }
        OperacionPago op = prep.operacion();
        if (!prep.nueva()) {
            return respuestaDeExistente(op, idUsuario);
        }

        // Los pasajeros y el token de sesión acompañan la nueva vigencia de los asientos (permite reintentar).
        pasajerosCache.guardar(op.getIdSesionReserva(), op.getFechaExpiracion(), prep.pasajeros());
        SesionReserva renovada = tokenSesionServicio.reemitir(op.getIdSesionReserva(), op.getIdViaje(),
                op.getFechaExpiracion());

        crearOrdenEnMercadoPago(op, construirSolicitud(req, op));
        return respuesta(op.getIdOperacionPago(), renovada);
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

        LocalDateTime expiracion = ahora.plusMinutes(propiedades.getMinutosPago());
        viajeAsientoServicio.extenderBloqueoSesion(req.idViaje(), idSesion, expiracion);

        OperacionPago op = new OperacionPago();
        op.setReferenciaExterna("RL-" + UUID.randomUUID());
        op.setClaveIdempotencia(req.claveIdempotencia());
        op.setIdViaje(req.idViaje());
        op.setIdSesionReserva(idSesion);
        op.setIdUsuario(idUsuario);
        op.setMedioPago(req.medioPago());
        op.setMonto(monto);
        op.setMoneda("PEN");
        op.setEstado(EstadoOperacion.CREANDO);
        op.setDatosPasajeros(datosPasajerosJson.escribir(pasajeros));
        op.setFechaExpiracion(expiracion);
        op.setFechaCreacion(ahora);
        op.setFechaActualizacion(ahora);
        op = operaciones.saveAndFlush(op);
        log.info("Operación de pago creada: referencia={}, viaje={}, asientos={}, monto={}, medio={}",
                op.getReferenciaExterna(), req.idViaje(), asientos.size(), monto, req.medioPago());
        return new Preparacion(op, true, pasajeros);
    }

    private void validarDatosDelMedio(IniciarPagoRequest req) {
        if ("TARJETA".equals(req.medioPago())) {
            if (req.metodoPagoId() == null || req.metodoPagoId().isBlank()) {
                throw new PagoException(HttpStatus.BAD_REQUEST, "No se pudo identificar la tarjeta.");
            }
            if (req.tipoPago() != null && !TIPOS_TARJETA.contains(req.tipoPago())) {
                throw new PagoException(HttpStatus.BAD_REQUEST, "Tipo de tarjeta no admitido.");
            }
        } else if (req.celular() == null || !req.celular().matches("\\d{9}")) {
            throw new PagoException(HttpStatus.BAD_REQUEST, "Ingresa el celular afiliado a Yape (9 dígitos).");
        }
    }

    SolicitudOrden construirSolicitud(IniciarPagoRequest req, OperacionPago op) {
        String email = propiedades.getEmailPagadorPrueba().isEmpty()
                ? req.emailPagador().trim() : propiedades.getEmailPagadorPrueba();
        String tipoDoc = req.tipoDocumento() != null && DOCUMENTOS_MP.contains(req.tipoDocumento()) ? req.tipoDocumento() : null;
        String numDoc = tipoDoc != null && req.numeroDocumento() != null && !req.numeroDocumento().isBlank()
                ? req.numeroDocumento().trim() : null;
        String descripcion = "RutaLibre - pasajes de bus";

        if ("YAPE".equals(req.medioPago())) {
            return new SolicitudOrden(op.getReferenciaExterna(), op.getMonto(), descripcion, email,
                    tipoDoc, numDoc, req.celular(), "yape", "debit_card", req.token(), 1, null);
        }
        String tipo = req.tipoPago() == null ? "credit_card" : req.tipoPago();
        int cuotas = "credit_card".equals(tipo) && req.cuotas() != null ? req.cuotas() : 1;
        return new SolicitudOrden(op.getReferenciaExterna(), op.getMonto(), descripcion, email, tipoDoc, numDoc,
                null, req.metodoPagoId(), tipo, req.token(), cuotas, propiedades.getValidacion3ds());
    }

    private void crearOrdenEnMercadoPago(OperacionPago op, SolicitudOrden solicitud) {
        // La clave de idempotencia de Mercado Pago es la referencia única de la operación: repetir el POST
        // (p. ej. tras un timeout) devuelve la misma order en lugar de cobrar dos veces.
        String clave = op.getReferenciaExterna();
        ErrorMercadoPagoException ultimo = null;
        for (int intento = 1; intento <= 2; intento++) {
            try {
                aplicarOrden(op.getIdOperacionPago(), mercadoPago.crearOrden(solicitud, clave));
                return;
            } catch (ErrorMercadoPagoException e) {
                ultimo = e;
                if (e.getTipo() != ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO) {
                    break;
                }
            }
        }

        switch (ultimo.getTipo()) {
            case PAGO_RECHAZADO -> {
                if (ultimo.getOrdenAdjunta() != null) {
                    aplicarOrden(op.getIdOperacionPago(), ultimo.getOrdenAdjunta());
                } else {
                    cerrarSinOrden(op.getIdOperacionPago(), EstadoOperacion.RECHAZADO, MensajesPago.rechazo(ultimo.getCodigo()));
                }
            }
            case SOLICITUD_INVALIDA, NO_CONFIGURADO, NO_ENCONTRADO -> {
                if ("invalid_email_for_sandbox".equals(ultimo.getCodigo())) {
                    log.error("Mercado Pago Sandbox exige un correo de pagador de prueba: configura MERCADOPAGO_EMAIL_PAGADOR_PRUEBA");
                }
                cerrarSinOrden(op.getIdOperacionPago(), EstadoOperacion.ERROR, MensajesPago.ERROR_DATOS);
            }
            case RESULTADO_DESCONOCIDO -> {
                // No se sabe si la order existe: queda CREANDO y la conciliación la busca por external_reference.
                log.warn("Resultado desconocido al crear la order de {}; se verificará", op.getReferenciaExterna());
                tx.executeWithoutResult(e -> operaciones.bloquearPorId(op.getIdOperacionPago()).ifPresent(o -> {
                    o.setMensaje(MensajesPago.VERIFICANDO);
                    o.setFechaActualizacion(LocalDateTime.now());
                }));
            }
        }
    }

    // =====================================================================================================
    // 2. Interpretar una order (creación, Webhook, consulta, conciliación)
    // =====================================================================================================

    /** Aplica a la operación el estado REAL de una order consultada en Mercado Pago. Idempotente. */
    public void aplicarOrden(Integer idOperacion, OrdenMercadoPago orden) {
        boolean reembolsar;
        try {
            reembolsar = Boolean.TRUE.equals(tx.execute(estado -> aplicarEnTransaccion(idOperacion, orden)));
        } catch (AsientoNoDisponibleException | CompraNoRegistrableException e) {
            // La transacción del registro se revirtió completa: no hay venta, pago ni pasajes a medias.
            log.error("Pago aprobado sin poder registrar la compra (operación {}): {}", idOperacion, e.getMessage());
            reembolsar = Boolean.TRUE.equals(tx.execute(estado -> marcarSinAsientos(idOperacion, orden)));
        }
        if (reembolsar) {
            intentarReembolso(idOperacion);
        }
    }

    private boolean aplicarEnTransaccion(Integer idOperacion, OrdenMercadoPago orden) {
        OperacionPago op = operaciones.bloquearPorId(idOperacion)
                .orElseThrow(() -> new IllegalStateException("Operación inexistente " + idOperacion));
        if (orden.referenciaExterna() != null && !op.getReferenciaExterna().equals(orden.referenciaExterna())) {
            log.error("La order {} no corresponde a la operación {}", orden.id(), op.getReferenciaExterna());
            return false;
        }
        if (op.getMpOrderId() == null) {
            op.setMpOrderId(orden.id());
        } else if (!op.getMpOrderId().equals(orden.id())) {
            log.error("La operación {} ya está asociada a otra order", op.getReferenciaExterna());
            return false;
        }
        LocalDateTime ahora = LocalDateTime.now();
        op.setMpEstado(recortar(orden.estado(), 40));
        op.setMpEstadoDetalle(recortar(orden.motivo(), 60));
        if (orden.idPago() != null) {
            op.setMpPaymentId(recortar(orden.idPago(), 64));
        }
        op.setFechaUltimaConsulta(ahora);
        op.setFechaActualizacion(ahora);

        switch (op.getEstado()) {
            case APROBADO -> {
                if (orden.fallidaOCerrada()) {
                    log.warn("La order {} de una compra ya registrada cambió a {}: revisar manualmente",
                            orden.id(), orden.estado());
                }
                return false;
            }
            case APROBADO_SIN_ASIENTOS, REEMBOLSADO -> {
                return false;
            }
            default -> {
                // continúa
            }
        }

        if (orden.aprobada()) {
            try {
                RegistroCompraServicio.verificarCorrespondencia(op, orden);
            } catch (IllegalStateException e) {
                throw new CompraNoRegistrableException(e.getMessage());
            }
            registroCompra.registrar(op, orden);
            op.setMensaje(MensajesPago.APROBADO);
            pasajerosCache.eliminar(op.getIdSesionReserva());
            return false;
        }
        if (!op.getEstado().esActivo()) {
            return false; // un estado final no retrocede por eventos tardíos o fuera de orden
        }
        if (orden.requiereDesafio3ds()) {
            op.setEstado(EstadoOperacion.ACCION_REQUERIDA);
            op.setUrlDesafio3ds(recortar(orden.urlDesafio3ds(), 500));
            op.setMensaje(MensajesPago.DESAFIO_3DS);
        } else if (orden.fallidaOCerrada()) {
            boolean vencida = "expired".equals(orden.estado()) || op.getFechaExpiracion().isBefore(ahora);
            op.setEstado(vencida ? EstadoOperacion.EXPIRADO : EstadoOperacion.RECHAZADO);
            op.setUrlDesafio3ds(null);
            op.setMensaje(vencida ? MensajesPago.EXPIRADO : MensajesPago.rechazo(orden.motivo()));
            log.info("Pago no aprobado: operacion={}, order={}, estado={}, detalle={}", op.getReferenciaExterna(),
                    orden.id(), orden.estado(), orden.motivo());
        } else {
            op.setEstado(EstadoOperacion.EN_PROCESO);
            op.setUrlDesafio3ds(null);
            op.setMensaje(MensajesPago.EN_PROCESO);
        }
        return false;
    }

    private boolean marcarSinAsientos(Integer idOperacion, OrdenMercadoPago orden) {
        OperacionPago op = operaciones.bloquearPorId(idOperacion).orElseThrow();
        if (op.getEstado() == EstadoOperacion.APROBADO || op.getIdVenta() != null) {
            return false;
        }
        if (op.getMpOrderId() == null) {
            op.setMpOrderId(orden.id());
        }
        op.setMpEstado(recortar(orden.estado(), 40));
        op.setMpEstadoDetalle(recortar(orden.motivo(), 60));
        op.setEstado(EstadoOperacion.APROBADO_SIN_ASIENTOS);
        op.setMensaje(MensajesPago.SIN_ASIENTOS);
        op.setUrlDesafio3ds(null);
        op.setDatosPasajeros(null);
        op.setFechaActualizacion(LocalDateTime.now());
        return true;
    }

    private void cerrarSinOrden(Integer idOperacion, EstadoOperacion estado, String mensaje) {
        tx.executeWithoutResult(e -> operaciones.bloquearPorId(idOperacion).ifPresent(op -> {
            if (op.getEstado().esActivo()) {
                op.setEstado(estado);
                op.setMensaje(mensaje);
                op.setFechaActualizacion(LocalDateTime.now());
            }
        }));
    }

    void intentarReembolso(Integer idOperacion) {
        OperacionPago op = operaciones.findById(idOperacion).orElse(null);
        if (op == null || op.getEstado() != EstadoOperacion.APROBADO_SIN_ASIENTOS || op.getMpOrderId() == null) {
            return;
        }
        try {
            mercadoPago.reembolsarOrden(op.getMpOrderId(), "refund-" + op.getReferenciaExterna());
            tx.executeWithoutResult(e -> operaciones.bloquearPorId(idOperacion).ifPresent(o -> {
                if (o.getEstado() == EstadoOperacion.APROBADO_SIN_ASIENTOS) {
                    o.setEstado(EstadoOperacion.REEMBOLSADO);
                    o.setMensaje(MensajesPago.REEMBOLSADO);
                    o.setFechaActualizacion(LocalDateTime.now());
                }
            }));
            log.info("Reembolso solicitado: operacion={}, order={}", op.getReferenciaExterna(), op.getMpOrderId());
        } catch (ErrorMercadoPagoException e) {
            log.error("No se pudo reembolsar la order {} ({}); se reintentará", op.getMpOrderId(), e.getTipo());
        }
    }

    // =====================================================================================================
    // 3. Sincronización (consulta del frontend y job)
    // =====================================================================================================

    /** Consulta a Mercado Pago el estado de una operación pendiente y lo aplica. Nunca lanza errores del proveedor. */
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
        try {
            if (op.getMpOrderId() != null) {
                aplicarOrden(idOperacion, mercadoPago.consultarOrden(op.getMpOrderId()));
            } else {
                OffsetDateTime creada = op.getFechaCreacion().atZone(ZoneId.systemDefault()).toOffsetDateTime();
                Optional<OrdenMercadoPago> encontrada = mercadoPago.buscarPorReferencia(
                        op.getReferenciaExterna(), creada.minusHours(1), OffsetDateTime.now().plusHours(1));
                if (encontrada.isPresent()) {
                    aplicarOrden(idOperacion, encontrada.get());
                } else if (op.getFechaCreacion().isBefore(
                        LocalDateTime.now().minusSeconds(propiedades.getSegundosResultadoDesconocido()))) {
                    log.warn("La order de {} no existe en Mercado Pago: se cierra sin cobro", op.getReferenciaExterna());
                    cerrarSinOrden(idOperacion, EstadoOperacion.ERROR, MensajesPago.ERROR_CREACION);
                } else {
                    marcarConsultada(idOperacion);
                }
            }
        } catch (ErrorMercadoPagoException e) {
            log.warn("No se pudo consultar la operación {} en Mercado Pago ({})", op.getReferenciaExterna(), e.getTipo());
            marcarConsultada(idOperacion);
        }
        expirarSiCorresponde(idOperacion);
    }

    private void expirarSiCorresponde(Integer idOperacion) {
        OperacionPago op = operaciones.findById(idOperacion).orElse(null);
        if (op == null || !op.getEstado().esActivo() || !op.getFechaExpiracion().isBefore(LocalDateTime.now())) {
            return;
        }
        if (op.getMpOrderId() != null) {
            try {
                // Cerrar la order evita que se apruebe cuando los asientos ya se liberaron.
                aplicarOrden(idOperacion, mercadoPago.cancelarOrden(op.getMpOrderId(), "cancel-" + op.getReferenciaExterna()));
            } catch (ErrorMercadoPagoException e) {
                log.warn("No se pudo cancelar la order {} ({})", op.getMpOrderId(), e.getTipo());
            }
        }
        cerrarSinOrden(idOperacion, EstadoOperacion.EXPIRADO, MensajesPago.EXPIRADO);
    }

    private void marcarConsultada(Integer idOperacion) {
        tx.executeWithoutResult(e -> operaciones.bloquearPorId(idOperacion).ifPresent(o -> {
            o.setFechaUltimaConsulta(LocalDateTime.now());
        }));
    }

    /** Webhook verificado: se consulta la order (no se confía en el cuerpo) y se aplica su estado. */
    public void procesarNotificacionOrden(String idOrden) {
        OrdenMercadoPago orden;
        try {
            orden = mercadoPago.consultarOrden(idOrden);
        } catch (ErrorMercadoPagoException e) {
            if (e.getTipo() == ErrorMercadoPagoException.Tipo.NO_ENCONTRADO) {
                log.warn("Webhook de una order inexistente: {}", idOrden);
                return;
            }
            throw e; // el controlador decide: fallo temporal o de credenciales -> 503 (reintento); rechazo definitivo -> 200
        }
        Optional<OperacionPago> op = operaciones.findByMpOrderId(orden.id());
        if (op.isEmpty() && orden.referenciaExterna() != null) {
            op = operaciones.findByReferenciaExterna(orden.referenciaExterna());
        }
        if (op.isEmpty()) {
            log.info("Webhook de una order ajena a RutaLibre: {}", orden.id());
            return;
        }
        aplicarOrden(op.get().getIdOperacionPago(), orden);
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

    // =====================================================================================================
    // 4. Respuestas
    // =====================================================================================================

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
                    op.getMpOrderId(), op.getMonto(),
                    e == EstadoOperacion.ACCION_REQUERIDA ? op.getUrlDesafio3ds() : null,
                    sesion, e == EstadoOperacion.APROBADO ? compra(op) : null);
        });
    }

    private CompraConfirmada compra(OperacionPago op) {
        Venta venta = ventaRepositorio.findById(op.getIdVenta()).orElseThrow();
        List<PasajeConfirmado> pasajes = pasajeRepositorio.findByIdVentaOrderByIdPasaje(venta.getIdVenta()).stream()
                .map(this::detallePasaje).toList();
        String idPago = op.getMpPaymentId() != null ? op.getMpPaymentId() : op.getMpOrderId();
        return new CompraConfirmada(venta.getIdVenta(), venta.getFechaVenta(), venta.getMontoTotal(), idPago, pasajes);
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

    /** Pago aprobado que no puede convertirse en compra (importe o referencia no coinciden). */
    static class CompraNoRegistrableException extends RuntimeException {
        CompraNoRegistrableException(String mensaje) {
            super(mensaje);
        }
    }
}
