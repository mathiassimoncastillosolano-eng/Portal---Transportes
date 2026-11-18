package com.transportes.viajes.dto;

import java.math.BigDecimal;

/** Un asiento del mapa de un viaje: posición, estado, precio y si lo tiene bloqueado mi sesión. */
public record AsientoDisponibilidadDTO(
        Integer idAsiento,
        String numero,
        int fila,
        String letra,
        String lado,
        short piso,
        String estado,   // "disponible", "bloqueado" u "ocupado"
        BigDecimal precio,
        boolean esMio    // true si lo bloqueó la sesión que pregunta
) {
}