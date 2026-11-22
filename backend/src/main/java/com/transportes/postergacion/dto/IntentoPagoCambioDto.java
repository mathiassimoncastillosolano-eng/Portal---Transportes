package com.transportes.postergacion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Un intento de pago de la diferencia, para mostrar el historial de intentos de un pasaje. */
public record IntentoPagoCambioDto(int numero, String metodo, BigDecimal monto, String resultado,
                                   String numeroOperacion, LocalDateTime fecha) {
}
