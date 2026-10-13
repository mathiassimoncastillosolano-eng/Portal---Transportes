package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Compra (registro de {@code venta}) con sus boletos y el viaje asociado.
 *
 * <p>{@code estado}: CONFIRMADA | REEMBOLSADA | SIN_CONFIRMAR (ver ReglasCompra). {@code fase}: PROXIMO |
 * REALIZADO | NO_REALIZADO | SIN_INFORMACION. {@code total} es {@code venta.monto_total}; {@code totalPasajes} es
 * la suma de los pasajes y {@code totalConsistente} indica si ambos coinciden.
 */
public record CompraDto(
        Integer idVenta, String codigoCompra,
        String estado, String estadoVenta, String estadoPago,
        String estadoViaje, String fase, boolean vigente, boolean documentoDisponible, boolean incompleta,
        String origen, String destino, LocalDate fechaSalida, String horaSalida,
        String empresa, String tipoBus,
        List<BoletoDto> boletos,
        BigDecimal total, BigDecimal totalPasajes, boolean totalConsistente, String moneda,
        LocalDateTime fechaCompra, String comprobante) {
}
