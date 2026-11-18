package com.transportes.buses.dto;

/**
 * Datos de un asiento físico para el frontend: dónde está en el bus (piso, fila, letra, lado). No dice si está
 * libre u ocupado; eso depende del viaje y lo arma ViajeAsientoServicio.
 */
public record AsientoFisicoDTO(
        String numero,
        int fila,
        String letra,
        String lado,
        short piso
) {
}