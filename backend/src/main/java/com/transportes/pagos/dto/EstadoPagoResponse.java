package com.transportes.pagos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Estado de un pago que se envía al frontend. */
public record EstadoPagoResponse(
        String referencia,
        String estado,
        boolean finalizado,
        boolean reintentable,
        String mensaje,
        String ordenId,
        BigDecimal montoTotal,
        String urlDesafio3ds,
        SesionRenovada sesion,
        CompraConfirmada compra,
        String entorno) {

    public record SesionRenovada(String tokenSesion, long segundosRestantes) {
    }

    public record CompraConfirmada(Integer idVenta, LocalDateTime fechaVenta, BigDecimal montoTotal,
                                   String idPagoProveedor, List<PasajeConfirmado> pasajes) {
    }

    public record PasajeConfirmado(Integer idPasaje, String asiento, short piso, String pasajero,
                                   String documento, BigDecimal precio) {
    }
}
