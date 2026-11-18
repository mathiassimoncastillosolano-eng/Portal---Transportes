package com.transportes.compras.reglas;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Reglas para saber el estado de una compra y si su viaje ya pasó o no. */
public final class ReglasCompra {

    /** Valor de venta.estado_venta cuando la venta se pagó. */
    public static final String VENTA_PAGADA = "PAGADA";
    /** Valor de pago.estado_pago cuando el pago se aprobó. */
    public static final String PAGO_APROBADO = "APROBADO";
    /** Único estado de viaje que lleva pasajeros. */
    public static final String VIAJE_PROGRAMADO = "PROGRAMADO";
    /** Estado de la operación de pago cuando el dinero se devolvió. */
    public static final String OPERACION_REEMBOLSADO = "REEMBOLSADO";

    /** Estado de la compra que ve el cliente. */
    public enum EstadoCompra {
        /** Venta PAGADA, pago APROBADO y sin reembolso. */
        CONFIRMADA,
        /** La operación de pago figura como REEMBOLSADO. */
        REEMBOLSADA,
        /** Cualquier otro caso (sin pago o con un estado inesperado). */
        SIN_CONFIRMAR
    }

    /** En qué momento está el viaje respecto de la hora actual. */
    public enum FaseViaje {
        /** Viaje PROGRAMADO que todavía no sale. */
        PROXIMO,
        /**
         * Viaje PROGRAMADO cuya hora de salida ya pasó. La base no guarda un estado "realizado", así que se deduce
         * de la hora.
         */
        REALIZADO,
        /** El viaje no está PROGRAMADO (cancelado, suspendido...). */
        NO_REALIZADO,
        /** Faltan datos del viaje (estado, fecha u hora). */
        SIN_INFORMACION
    }

    private ReglasCompra() {
    }

    /** Junta los estados de venta, pago y operación de pago en un solo estado de compra. */
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

    /** Calcula si el viaje es próximo, ya se realizó o no se realizó. */
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

    /** Compra vigente: confirmada y con un viaje que todavía no sale. */
    public static boolean esVigente(EstadoCompra estado, FaseViaje fase) {
        return estado == EstadoCompra.CONFIRMADA && fase == FaseViaje.PROXIMO;
    }

    /**
     * El PDF del boleto se puede descargar si la compra está confirmada y el viaje no fue cancelado ni le faltan
     * datos.
     */
    public static boolean documentoDisponible(EstadoCompra estado, FaseViaje fase) {
        return estado == EstadoCompra.CONFIRMADA && (fase == FaseViaje.PROXIMO || fase == FaseViaje.REALIZADO);
    }

    /** Oculta parte del documento: "DNI ****678". */
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
