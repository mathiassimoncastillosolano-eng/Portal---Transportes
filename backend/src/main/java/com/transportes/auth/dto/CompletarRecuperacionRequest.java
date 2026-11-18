package com.transportes.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos para guardar la nueva contraseña: la prueba verificada y la contraseña nueva.
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
