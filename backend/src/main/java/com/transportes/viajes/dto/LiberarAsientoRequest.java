package com.transportes.viajes.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo para liberar: el token de la sesión. */
public record LiberarAsientoRequest(
        @NotBlank(message = "El tokenSesion es obligatorio") String tokenSesion
) {
}