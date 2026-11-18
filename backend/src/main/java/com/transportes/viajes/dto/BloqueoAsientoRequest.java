package com.transportes.viajes.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo para bloquear un asiento: el token de la sesión. */
public record BloqueoAsientoRequest(
        @NotBlank(message = "El tokenSesion es obligatorio") String tokenSesion
) {
}