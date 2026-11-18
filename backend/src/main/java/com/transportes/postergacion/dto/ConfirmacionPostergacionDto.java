package com.transportes.postergacion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Respuesta de un cambio ACEPTADO (criterio 11): nuevo viaje, fecha, horario y asiento, junto con los datos
 * anteriores y el monto pagado. Un rechazo no usa esta clase: responde 409 con el motivo.
 * @param aceptada siempre true
 */
public record ConfirmacionPostergacionDto(
        boolean aceptada, int idPostergacion, int idPasaje, int idVenta,
        long idViajeAnterior, String asientoAnterior,
        long idViajeNuevo, String origen, String destino, LocalDate fechaSalida, LocalTime horaSalida,
        String asientoNuevo, BigDecimal importeAdicional, String referenciaPago, LocalDateTime fecha) {
}
