package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Una fila de la consulta de compras: una por pasaje (o una sola con los campos del pasaje en null si la venta
 * no tuviera pasajes). Es un registro interno de lectura; no se expone en la API.
 */
public record FilaCompra(
        int idVenta, String estadoVenta, BigDecimal montoTotal, LocalDateTime fechaVenta,
        String estadoPago, String estadoOperacion, String moneda,
        String comprobanteSerie, String comprobanteNumero, String tipoComprobante,
        Integer idPasaje, BigDecimal precioPasaje,
        String tipoDocumento, String numeroDocumento, String nombres, String apellidos,
        String numeroAsiento, Short piso,
        Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
        String origen, String destino, String tipoBus) {
}
