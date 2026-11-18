package com.transportes.viajes.dto;

import java.util.Map;

/** Mapa completo del bus: cuántos pisos tiene y los asientos de cada piso. */
public record MapaAsientosViajeDTO(
        int pisos,
        Map<String, PisoMapaDTO> mapaPorPiso
) {
}