package com.transportes.viajes.dto;

import java.math.BigDecimal;

/** Un asiento del mapa: posición, estado (disponible, bloqueado u ocupado), precio y si es de mi sesión. */
public record AsientoDisponibilidadDTO(
        Integer idAsiento,
        String numero,
        int fila,
        String letra,
        String lado,
        short piso,
        String estado,   // "disponible" | "bloqueado" | "ocupado"
        BigDecimal precio,
        boolean esMio    // true solo si está bloqueado por la sesión indicada
) {
}