package com.transportes.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo de {@code POST /api/auth/password-reset/verify}. */
public record VerificarCodigoRequest(
        @NotBlank(message = "El correo es obligatorio.")
        @Size(max = 150, message = "El correo admite hasta 150 caracteres.")
        String correo,
        @NotBlank(message = "El código es obligatorio.")
        @Size(max = 20, message = "El código no es válido.")
        String codigo) {
}
