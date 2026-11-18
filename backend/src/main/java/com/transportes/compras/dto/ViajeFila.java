package com.transportes.compras.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/** Datos de un viaje leídos en la consulta de compras. */
public record ViajeFila(
        Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
        String origen, String destino, String tipoBus, String numeroAsiento, Integer duracionMin) {
}
