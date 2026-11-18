package com.transportes.viajes.dto;

import jakarta.validation.constraints.NotBlank;

/** Cuerpo para liberar un asiento: el token de la sesión de reserva. */
public record LiberarAsientoRequest(
        @NotBlank(message = "El tokenSesion es obligatorio") String tokenSesion
) {
}