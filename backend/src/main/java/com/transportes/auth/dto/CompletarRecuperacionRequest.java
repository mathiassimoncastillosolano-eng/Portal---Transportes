package com.transportes.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de {@code POST /api/auth/password-reset/complete}. No lleva identificador
 * de usuario: la cuenta se deduce de la prueba de recuperacion verificada.
 */
public record CompletarRecuperacionRequest(
        @NotBlank(message = "La verificación es obligatoria.")
        @Size(max = 512, message = "La verificación no es válida.")
        String pruebaRecuperacion,
        @NotBlank(message = "La contraseña es obligatoria.")
        @Size(max = 200, message = "La contraseña es demasiado larga.")
        String contrasena,
        @NotBlank(message = "Confirma la contraseña.")
        @Size(max = 200, message = "La contraseña es demasiado larga.")
        String confirmarContrasena) {
}
