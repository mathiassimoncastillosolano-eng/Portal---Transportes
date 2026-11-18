package com.transportes.viajes.dto;

import java.util.List;

/** Un piso del bus: número de filas, asientos por lado y la lista de asientos. */
public record PisoMapaDTO(
        short piso,
        int filas,
        List<Integer> asientosPorLado,
        String descripcion,
        List<AsientoDisponibilidadDTO> asientos
) {
}