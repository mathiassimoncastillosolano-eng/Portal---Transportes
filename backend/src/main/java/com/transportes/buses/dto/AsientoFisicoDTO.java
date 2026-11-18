package com.transportes.buses.dto;

/** Posición de un asiento en el bus: piso, fila, letra y lado. */
public record AsientoFisicoDTO(
        String numero,
        int fila,
        String letra,
        String lado,
        short piso
) {
}