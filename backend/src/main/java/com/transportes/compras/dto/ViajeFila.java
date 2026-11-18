package com.transportes.compras.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Datos internos de un viaje leídos en la consulta de compras. Se usan para el viaje anterior y el viaje original
 * de un pasaje cambiado. numeroAsiento es el asiento que tenía en ese viaje; duracionMin sirve para calcular la
 * llegada (null si no se conoce).
 */
public record ViajeFila(
        Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
        String origen, String destino, String tipoBus, String numeroAsiento, Integer duracionMin) {
}
