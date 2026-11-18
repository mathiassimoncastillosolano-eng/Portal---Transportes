package com.transportes.compras.dto;

import java.time.LocalDate;

/**
 * Un viaje tal como lo muestran la tarjeta y el PDF del boleto: el viaje actual o el que tenía antes de un cambio.
 * asiento es el asiento del boleto en ESE viaje. horaLlegada es null si la ruta no tiene duración estimada.
 */
public record ViajeBoletoDto(
        Long idViaje, String origen, String destino, LocalDate fechaSalida, String horaSalida, String horaLlegada,
        String empresa, String tipoBus, String asiento) {
}
