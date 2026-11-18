package com.transportes.postergacion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Datos que se devuelven cuando el cambio de pasaje se confirma. */
public record ConfirmacionPostergacionDto(
        boolean aceptada, int idPostergacion, int idPasaje, int idVenta,
        long idViajeAnterior, String asientoAnterior,
        long idViajeNuevo, String origen, String destino, LocalDate fechaSalida, LocalTime horaSalida,
        String asientoNuevo, BigDecimal importeAdicional, String referenciaPago, LocalDateTime fecha) {
}
