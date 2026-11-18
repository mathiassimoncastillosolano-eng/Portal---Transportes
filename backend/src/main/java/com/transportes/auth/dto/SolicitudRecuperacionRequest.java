package com.transportes.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Correo para el paso 1 (pedir o reenviar el código). */
public record SolicitudRecuperacionRequest(
        @NotBlank(message = "El correo es obligatorio.")
        @Size(max = 150, message = "El correo admite hasta 150 caracteres.")
        String correo) {
}
