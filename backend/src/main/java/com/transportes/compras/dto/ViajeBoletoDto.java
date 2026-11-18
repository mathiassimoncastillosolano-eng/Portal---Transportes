package com.transportes.compras.dto;

import java.time.LocalDate;

/** Datos del viaje de un boleto: origen, destino, fecha, horas y asiento. */
public record ViajeBoletoDto(
        Long idViaje, String origen, String destino, LocalDate fechaSalida, String horaSalida, String horaLlegada,
        String empresa, String tipoBus, String asiento) {
}
