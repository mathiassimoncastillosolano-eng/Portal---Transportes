package com.transportes.viajes.dto;

import java.time.LocalDateTime;

/** Asiento bloqueado y hasta cuándo. */
public record BloqueoAsientoResponseDTO(
        String numero,
        String estado,
        LocalDateTime fechaExpiracionBloqueo
) {
}