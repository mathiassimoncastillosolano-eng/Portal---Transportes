package com.transportes.pagos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Estado de una operación de pago tal como lo verificó el backend.
 *
 * @param estado      CREANDO | EN_PROCESO | ACCION_REQUERIDA | APROBADO | RECHAZADO | EXPIRADO | ERROR
 *                    | APROBADO_SIN_ASIENTOS | REEMBOLSADO
 * @param finalizado  true si el estado ya no cambiará por sí solo
 * @param reintentable true si el comprador puede intentar pagar de nuevo (los asientos siguen reservados)
 * @param sesion      token de sesión reemitido cuando el servidor extendió la reserva (null si no cambió)
 * @param compra      datos de la compra registrada; solo con estado APROBADO
 */
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
        CompraConfirmada compra) {

    public record SesionRenovada(String tokenSesion, long segundosRestantes) {
    }

    public record CompraConfirmada(Integer idVenta, LocalDateTime fechaVenta, BigDecimal montoTotal,
                                   String idPagoProveedor, List<PasajeConfirmado> pasajes) {
    }

    public record PasajeConfirmado(Integer idPasaje, String asiento, short piso, String pasajero,
                                   String documento, BigDecimal precio) {
    }
}
