package com.transportes.viajes.dto;

import jakarta.validation.constraints.NotBlank;

public record LiberarAsientoRequest(
        @NotBlank(message = "El token de sesión es obligatorio") String tokenBloqueo
) {
}