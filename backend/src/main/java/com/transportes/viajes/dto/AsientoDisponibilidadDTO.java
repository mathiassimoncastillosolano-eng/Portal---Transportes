package com.transportes.viajes.dto;

import java.math.BigDecimal;

public record AsientoDisponibilidadDTO(
        Integer idAsiento,
        String numero,
        int fila,
        String letra,
        String lado,
        short piso,
        String estado,
        BigDecimal precio
) {
}