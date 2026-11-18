package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Una compra (registro de venta) con sus boletos, lista para la pantalla.
 * estado: CONFIRMADA, REEMBOLSADA o SIN_CONFIRMAR. fase: PROXIMO, REALIZADO, NO_REALIZADO o SIN_INFORMACION (ver
 * ReglasCompra).
 * Los datos del viaje (origen, destino, fecha, hora, bus) son los del viaje en que se compró, aunque luego algún
 * boleto se cambiara; el viaje actual de cada boleto está en BoletoDto.viajeVigente.
 * estadoViaje y fase usan el viaje más tardío de los boletos: la compra sigue "próxima" mientras algún boleto no
 * haya viajado.
 * total: venta.monto_total. totalPasajes: suma de los pasajes. totalConsistente: si ambos coinciden. totalPagado:
 * total más lo pagado en los cambios de viaje.
 * horaLlegada es null si la ruta no tiene duración estimada.
 */
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
