package com.transportes.viajes.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BloqueoAsientoRequest(
        @NotBlank(message = "El token de sesión es obligatorio") String tokenBloqueo,
        @NotBlank(message = "El tipo de documento es obligatorio")
        @Pattern(regexp = "DNI|CE|PASAPORTE", message = "tipoDocumento debe ser DNI, CE o PASAPORTE")
        String tipoDocumento,
        @NotBlank(message = "El número de documento es obligatorio") String numeroDocumento,
        @NotBlank(message = "Los nombres son obligatorios") String nombres,
        @NotBlank(message = "Los apellidos son obligatorios") String apellidos,
        LocalDate fechaNacimiento
) {
}