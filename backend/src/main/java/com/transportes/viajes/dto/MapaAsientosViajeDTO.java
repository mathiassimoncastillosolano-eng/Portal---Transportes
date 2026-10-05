package com.transportes.viajes.dto;

import java.util.Map;

public record MapaAsientosViajeDTO(
        int pisos,
        Map<String, PisoMapaDTO> mapaPorPiso
) {
}