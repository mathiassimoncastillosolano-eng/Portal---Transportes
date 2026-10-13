package com.transportes.compras.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/** Fila mínima (una por pasaje) para calcular los indicadores del perfil sin resolver rutas ni asientos. */
public record FilaResumen(
        int idVenta, String estadoVenta, String estadoPago, String estadoOperacion,
        Integer idPasaje, Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje) {
}
