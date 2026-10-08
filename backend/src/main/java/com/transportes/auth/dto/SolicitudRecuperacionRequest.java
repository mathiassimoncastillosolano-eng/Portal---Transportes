package com.transportes.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo de {@code POST /api/auth/password-reset/request} y {@code /resend}. */
public record SolicitudRecuperacionRequest(
        @NotBlank(message = "El correo es obligatorio.")
        @Size(max = 150, message = "El correo admite hasta 150 caracteres.")
        String correo) {
}
