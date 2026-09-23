package com.transportes.buses.dto;

/**
 * DTO de solo lectura para el endpoint de distribución de asientos.
 * Representa la posición física de un asiento, sin información de
 * disponibilidad (eso vive en viaje_asiento y en las Tareas 2/3).
 */
public record AsientoFisicoDTO(
        String numero,
        int fila,
        String letra,
        String lado,
        short piso
) {
}