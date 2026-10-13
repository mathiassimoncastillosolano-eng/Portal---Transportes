package com.transportes.compras.reglas;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Reglas de negocio de "Mis pasajes", resumen e historial. Son funciones puras (sin acceso a datos ni a Spring)
 * para que el criterio quede en un único lugar y pueda probarse sin base de datos.
 *
 * <p>Se mantienen separados tres conceptos que NO son lo mismo:
 * <ul>
 *   <li><b>Estado de la compra</b>: lo que dicen {@code venta}, {@code pago} y {@code operacion_pago}.</li>
 *   <li><b>Estado del viaje</b>: {@code viaje.estado_viaje} (el sistema solo usa PROGRAMADO; el resto, como
 *       CANCELADO, impide reservar).</li>
 *   <li><b>Fase del viaje</b>: derivada del estado del viaje y de la fecha/hora de salida (hora de Perú).</li>
 * </ul>
 */
public final class ReglasCompra {

    /** Valor que escribe RegistroCompraServicio en venta.estado_venta. */
    public static final String VENTA_PAGADA = "PAGADA";
    /** Valor que escribe RegistroCompraServicio en pago.estado_pago. */
    public static final String PAGO_APROBADO = "APROBADO";
    /** Único estado de viaje que admite pasajeros (mismo criterio que PoliticaReservaViaje). */
    public static final String VIAJE_PROGRAMADO = "PROGRAMADO";
    /** EstadoOperacion.REEMBOLSADO: cobro devuelto al comprador. */
    public static final String OPERACION_REEMBOLSADO = "REEMBOLSADO";

    /** Estado de la compra según los registros de venta, pago y operación de pago. */
    public enum EstadoCompra {
        /** Venta PAGADA con pago APROBADO y sin reembolso. */
        CONFIRMADA,
        /** La operación de pago asociada figura como REEMBOLSADO. */
        REEMBOLSADA,
        /** Cualquier otra combinación (pago ausente o con un estado que el sistema no escribe). */
        SIN_CONFIRMAR
    }

    /** Fase del viaje respecto del reloj de negocio. */
    public enum FaseViaje {
        /** Viaje PROGRAMADO cuya salida aún no ocurrió. */
        PROXIMO,
        /**
         * Viaje PROGRAMADO cuya hora de salida ya pasó. La base no guarda un estado "realizado": es el criterio
         * más preciso que admite el modelo (ver documentación de la entrega).
         */
        REALIZADO,
        /** estado_viaje distinto de PROGRAMADO (cancelado, suspendido…): el viaje no se considera realizado. */
        NO_REALIZADO,
        /** Faltan datos del viaje (estado, fecha u hora). */
        SIN_INFORMACION
    }

    private ReglasCompra() {
    }

    public static EstadoCompra estadoCompra(String estadoVenta, String estadoPago, String estadoOperacion) {
        if (OPERACION_REEMBOLSADO.equalsIgnoreCase(recortar(estadoOperacion))) {
            return EstadoCompra.REEMBOLSADA;
        }
        if (VENTA_PAGADA.equalsIgnoreCase(recortar(estadoVenta))
                && PAGO_APROBADO.equalsIgnoreCase(recortar(estadoPago))) {
            return EstadoCompra.CONFIRMADA;
        }
        return EstadoCompra.SIN_CONFIRMAR;
    }

    /**
     * @param ahora hora actual de negocio (America/Lima), la misma zona en la que se guardan fecha y hora de salida
     */
    public static FaseViaje faseViaje(String estadoViaje, LocalDate fechaSalida, LocalTime horaSalida,
                                      LocalDateTime ahora) {
        if (estadoViaje == null || fechaSalida == null || horaSalida == null) {
            return FaseViaje.SIN_INFORMACION;
        }
        if (!VIAJE_PROGRAMADO.equalsIgnoreCase(estadoViaje.trim())) {
            return FaseViaje.NO_REALIZADO;
        }
        return fechaSalida.atTime(horaSalida).isAfter(ahora) ? FaseViaje.PROXIMO : FaseViaje.REALIZADO;
    }

    /** Compra vigente: confirmada y con un viaje programado que todavía no sale. */
    public static boolean esVigente(EstadoCompra estado, FaseViaje fase) {
        return estado == EstadoCompra.CONFIRMADA && fase == FaseViaje.PROXIMO;
    }

    /**
     * Un boleto/constancia puede descargarse solo si la compra está confirmada y el viaje no fue cancelado ni
     * carece de datos. No implica un documento "válido para viajar": el sistema no define ni guarda ese estado.
     */
    public static boolean documentoDisponible(EstadoCompra estado, FaseViaje fase) {
        return estado == EstadoCompra.CONFIRMADA && (fase == FaseViaje.PROXIMO || fase == FaseViaje.REALIZADO);
    }

    /** Muestra el documento sin exponerlo completo: "DNI ****678". */
    public static String enmascararDocumento(String tipo, String numero) {
        if (numero == null || numero.isBlank()) {
            return null;
        }
        String limpio = numero.trim();
        String visible = limpio.length() <= 3 ? "" : limpio.substring(limpio.length() - 3);
        String etiqueta = tipo == null || tipo.isBlank() ? "" : tipo.trim() + " ";
        return etiqueta + "****" + visible;
    }

    private static String recortar(String valor) {
        return valor == null ? null : valor.trim();
    }
}
