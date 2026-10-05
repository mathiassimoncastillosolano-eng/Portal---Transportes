package com.transportes.viajes.dto;

import jakarta.validation.constraints.NotBlank;

public record LiberarAsientoRequest(
        @NotBlank(message = "El tokenSesion es obligatorio") String tokenSesion
) {
}