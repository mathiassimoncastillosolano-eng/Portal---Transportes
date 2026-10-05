package com.transportes.viajes.dto;

import java.util.List;

public record PisoMapaDTO(
        short piso,
        int filas,
        List<Integer> asientosPorLado,
        String descripcion,
        List<AsientoDisponibilidadDTO> asientos
) {
}