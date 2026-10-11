package com.transportes.pagos.servicios;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.pagos.configuracion.PropiedadesPago;
import com.transportes.pagos.entidades.EstadoOperacion;
import com.transportes.pagos.entidades.OperacionPago;
import com.transportes.pagos.entidades.Pago;
import com.transportes.pagos.entidades.Pasaje;
import com.transportes.pagos.entidades.Venta;
import com.transportes.pagos.mercadopago.OrdenMercadoPago;
import com.transportes.pagos.repositorios.MetodoPagoRepositorio;
import com.transportes.pagos.repositorios.PagoRepositorio;
import com.transportes.pagos.repositorios.PasajeRepositorio;
import com.transportes.pagos.repositorios.VentaRepositorio;
import com.transportes.viajes.dto.PasajeroAsientoRequest;
import com.transportes.viajes.excepciones.AsientoNoDisponibleException;
import com.transportes.viajes.servicios.ViajeAsientoServicio;
import com.transportes.viajes.servicios.ViajeAsientoServicio.AsientoOcupado;

/**
 * Registro DEFINITIVO de una compra. Solo se invoca con una order que el backend consultó en Mercado Pago y que
 * está {@code processed/accredited}. Todo ocurre en la transacción del llamador (que además tiene bloqueada la
 * fila de la operación): pasajeros, asientos OCUPADO, venta, pago y pasajes se guardan juntos o no se guarda nada.
 */
@Service
public class RegistroCompraServicio {

    private static final Logger log = LoggerFactory.getLogger(RegistroCompraServicio.class);

    private final ViajeAsientoServicio viajeAsientoServicio;
    private final VentaRepositorio ventaRepositorio;
    private final PagoRepositorio pagoRepositorio;
    private final PasajeRepositorio pasajeRepositorio;
    private final MetodoPagoRepositorio metodoPagoRepositorio;
    private final DatosPasajerosJson datosPasajerosJson;
    private final PropiedadesPago propiedades;

    public RegistroCompraServicio(ViajeAsientoServicio viajeAsientoServicio, VentaRepositorio ventaRepositorio,
                                  PagoRepositorio pagoRepositorio, PasajeRepositorio pasajeRepositorio,
                                  MetodoPagoRepositorio metodoPagoRepositorio, DatosPasajerosJson datosPasajerosJson,
                                  PropiedadesPago propiedades) {
        this.viajeAsientoServicio = viajeAsientoServicio;
        this.ventaRepositorio = ventaRepositorio;
        this.pagoRepositorio = pagoRepositorio;
        this.pasajeRepositorio = pasajeRepositorio;
        this.metodoPagoRepositorio = metodoPagoRepositorio;
        this.datosPasajerosJson = datosPasajerosJson;
        this.propiedades = propiedades;
    }

    /**
     * @param op    operación bloqueada (SELECT ... FOR UPDATE) en la transacción actual
     * @param orden order consultada en Mercado Pago
     * @throws AsientoNoDisponibleException si los asientos o el importe ya no coinciden (se revierte todo)
     * @throws IllegalStateException si la order no corresponde a la operación o no está aprobada
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Venta registrar(OperacionPago op, OrdenMercadoPago orden) {
        if (op.getIdVenta() != null) {
            throw new IllegalStateException("La operación ya tiene una venta registrada");
        }
        verificarCorrespondencia(op, orden);

        List<PasajeroAsientoRequest> pasajeros = datosPasajerosJson.leer(op.getDatosPasajeros());
        if (pasajeros.isEmpty()) {
            throw new AsientoNoDisponibleException("La operación no conserva los datos de los pasajeros.");
        }

        Integer idMetodo = idMetodoPago(op.getMedioPago());
        List<AsientoOcupado> ocupados =
                viajeAsientoServicio.ocuparAsientosDeSesion(op.getIdViaje(), op.getIdSesionReserva(), pasajeros);

        BigDecimal total = ocupados.stream().map(AsientoOcupado::precio).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(op.getMonto()) != 0) {
            throw new AsientoNoDisponibleException("El importe de los asientos cambió durante el pago.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        Venta venta = new Venta();
        venta.setIdUsuario(op.getIdUsuario());
        venta.setFechaVenta(ahora);
        venta.setMontoTotal(op.getMonto());
        venta.setFechaCreacion(ahora);
        venta.setEstadoVenta(Venta.ESTADO_PAGADA);
        venta = ventaRepositorio.saveAndFlush(venta);

        Pago pago = new Pago();
        pago.setIdVenta(venta.getIdVenta());
        pago.setIdMetodoPago(idMetodo);
        pago.setMonto(op.getMonto());
        pago.setFechaPago(ahora);
        pago.setFechaCreacion(ahora);
        pago.setEstadoPago(Pago.ESTADO_APROBADO);
        pagoRepositorio.saveAndFlush(pago);

        for (AsientoOcupado o : ocupados) {
            Pasaje pasaje = new Pasaje();
            pasaje.setIdVenta(venta.getIdVenta());
            pasaje.setIdPasajero(o.idPasajero());
            pasaje.setIdViajeAsiento(o.idViajeAsiento());
            pasaje.setPrecio(o.precio());
            pasaje.setFechaCreacion(ahora);
            pasajeRepositorio.save(pasaje);
        }
        pasajeRepositorio.flush();

        op.setIdVenta(venta.getIdVenta());
        op.setEstado(EstadoOperacion.APROBADO);
        op.setMensaje(null);
        op.setUrlDesafio3ds(null);
        op.setDatosPasajeros(null); // minimización: los datos ya están en pasajero/pasaje
        op.setFechaActualizacion(ahora);

        log.info("Compra registrada: operacion={}, order={}, venta={}, pasajes={}",
                op.getReferenciaExterna(), op.getMpOrderId(), venta.getIdVenta(), ocupados.size());
        return venta;
    }

    /** Antes de cobrar: falla rápido si falta el método de pago en el catálogo (migración 003 no aplicada). */
    public Integer idMetodoPago(String medioPago) {
        String nombre = "YAPE".equals(medioPago) ? propiedades.getNombreMetodoYape() : propiedades.getNombreMetodoTarjeta();
        return metodoPagoRepositorio.findByNombreMetodoAndActivoTrue(nombre)
                .orElseThrow(() -> new IllegalStateException("No existe el método de pago activo '" + nombre
                        + "' en metodo_pago. Ejecuta la migración 003."))
                .getIdMetodoPago();
    }

    static void verificarCorrespondencia(OperacionPago op, OrdenMercadoPago orden) {
        if (orden == null || !orden.aprobada()) {
            throw new IllegalStateException("La order no está aprobada");
        }
        if (op.getMpOrderId() != null && !op.getMpOrderId().equals(orden.id())) {
            throw new IllegalStateException("La order no corresponde a la operación");
        }
        if (orden.referenciaExterna() != null && !op.getReferenciaExterna().equals(orden.referenciaExterna())) {
            throw new IllegalStateException("La referencia externa no coincide");
        }
        if (orden.montoTotal() == null || orden.montoTotal().compareTo(op.getMonto()) != 0) {
            throw new IllegalStateException("El importe de la order no coincide con la operación");
        }
        if (orden.montoPagado() != null && orden.montoPagado().compareTo(op.getMonto()) < 0) {
            throw new IllegalStateException("El importe pagado es menor al de la operación");
        }
        if (orden.moneda() != null && !orden.moneda().equalsIgnoreCase(op.getMoneda())) {
            throw new IllegalStateException("La moneda de la order no coincide");
        }
    }
}
