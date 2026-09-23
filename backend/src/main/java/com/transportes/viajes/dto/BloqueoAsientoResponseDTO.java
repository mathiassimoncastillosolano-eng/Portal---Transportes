package com.transportes.viajes.dto;

import java.time.LocalDateTime;

public record BloqueoAsientoResponseDTO(
        String numero,
        String estado,
        LocalDateTime fechaExpiracionBloqueo
) {
}