package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Datos de una compra con sus boletos, para mostrar en "Mis pasajes". */
public record CompraDto(
        Integer idVenta, String codigoCompra,
        String estado, String estadoVenta, String estadoPago,
        String estadoViaje, String fase, boolean vigente, boolean documentoDisponible, boolean incompleta,
        String origen, String destino, LocalDate fechaSalida, String horaSalida,
        String empresa, String tipoBus,
        List<BoletoDto> boletos,
        BigDecimal total, BigDecimal totalPasajes, boolean totalConsistente, String moneda,
        LocalDateTime fechaCompra, String comprobante,
        Long idViaje, BigDecimal totalPagado, String horaLlegada, Integer idPago) {
}
