package com.transportes.pagos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;

public record EstadoPagoResponse(
        String referencia,
        String estado,
        boolean finalizado,
        boolean reintentable,
        String mensaje,
        String cargoId,
        BigDecimal montoTotal,
        boolean requiere3ds,
        SesionRenovada sesion,
        CompraConfirmada compra,
        String entorno,
        ConfirmacionPostergacionDto cambio) {

    public record SesionRenovada(String tokenSesion, long segundosRestantes) {
    }

    public record CompraConfirmada(Integer idVenta, LocalDateTime fechaVenta, BigDecimal montoTotal,
                                   String idPagoProveedor, List<PasajeConfirmado> pasajes) {
    }

    public record PasajeConfirmado(Integer idPasaje, String asiento, short piso, String pasajero,
                                   String documento, BigDecimal precio) {
    }
}
