package com.transportes.postergacion.dto;

import java.math.BigDecimal;

/**
 * Respuesta al registrar el pago de la diferencia.
 * Si el pago fue aprobado, cambioAplicado es true y confirmacion trae el nuevo viaje, fecha, hora y asiento.
 */
public record ResultadoPagoCambioDto(boolean cambioAplicado, String resultado, String metodo, BigDecimal monto,
                                     String mensajeParaAgente, ConfirmacionPostergacionDto confirmacion) {
}
