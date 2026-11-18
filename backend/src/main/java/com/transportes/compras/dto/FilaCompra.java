package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Fila interna de la consulta de compras: una por pasaje (no se envía al frontend).
 * Los datos de viaje son los del viaje ACTUAL del pasaje (el nuevo si se cambió).
 * adicionalPagado: suma de lo pagado en sus cambios (0 si nunca se cambió).
 * Solo si el pasaje fue cambiado vienen: viajeAnterior (antes del último cambio), viajeOriginal (en el que se
 * compró) y fechaCambio; si no, son null.
 * duracionMin: duración estimada de la ruta, o null si no se conoce.
 */
public record FilaCompra(
        int idVenta, String estadoVenta, BigDecimal montoTotal, LocalDateTime fechaVenta,
        String estadoPago, String estadoOperacion, String moneda,
        String comprobanteSerie, String comprobanteNumero, String tipoComprobante,
        Integer idPasaje, BigDecimal precioPasaje,
        String tipoDocumento, String numeroDocumento, String nombres, String apellidos,
        String numeroAsiento, Short piso,
        Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
        String origen, String destino, String tipoBus,
        BigDecimal adicionalPagado,
        ViajeFila viajeAnterior, ViajeFila viajeOriginal, LocalDateTime fechaCambio,
        Integer idPago, Integer duracionMin) {

    /** Constructor para un pasaje nunca cambiado: sin viaje anterior, sin viaje original y sin fecha de cambio. */
    public FilaCompra(
            int idVenta, String estadoVenta, BigDecimal montoTotal, LocalDateTime fechaVenta,
            String estadoPago, String estadoOperacion, String moneda,
            String comprobanteSerie, String comprobanteNumero, String tipoComprobante,
            Integer idPasaje, BigDecimal precioPasaje,
            String tipoDocumento, String numeroDocumento, String nombres, String apellidos,
            String numeroAsiento, Short piso,
            Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
            String origen, String destino, String tipoBus,
            BigDecimal adicionalPagado) {
        this(idVenta, estadoVenta, montoTotal, fechaVenta, estadoPago, estadoOperacion, moneda,
                comprobanteSerie, comprobanteNumero, tipoComprobante, idPasaje, precioPasaje,
                tipoDocumento, numeroDocumento, nombres, apellidos, numeroAsiento, piso,
                idViaje, fechaSalida, horaSalida, estadoViaje, origen, destino, tipoBus,
                adicionalPagado, null, null, null, null, null);
    }

    /** true si el pasaje se cambió de viaje al menos una vez. */
    public boolean fueCambiado() {
        return viajeOriginal != null;
    }

    /**
     * Copia de la fila con los datos del viaje en que se COMPRÓ el pasaje. Sirve para describir la compra
     * original. Si el pasaje nunca se cambió, devuelve la misma fila.
     */
    public FilaCompra conViajeOriginal() {
        if (!fueCambiado()) {
            return this;
        }
        return new FilaCompra(idVenta, estadoVenta, montoTotal, fechaVenta, estadoPago, estadoOperacion, moneda,
                comprobanteSerie, comprobanteNumero, tipoComprobante, idPasaje, precioPasaje,
                tipoDocumento, numeroDocumento, nombres, apellidos, numeroAsiento, piso,
                viajeOriginal.idViaje(), viajeOriginal.fechaSalida(), viajeOriginal.horaSalida(),
                viajeOriginal.estadoViaje(), viajeOriginal.origen(), viajeOriginal.destino(), viajeOriginal.tipoBus(),
                adicionalPagado, viajeAnterior, viajeOriginal, fechaCambio, idPago, viajeOriginal.duracionMin());
    }
}
