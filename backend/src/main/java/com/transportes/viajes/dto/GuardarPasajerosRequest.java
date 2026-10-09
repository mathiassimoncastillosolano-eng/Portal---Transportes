package com.transportes.viajes.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record GuardarPasajerosRequest(
        @NotBlank(message = "El tokenSesion es obligatorio") String tokenSesion,
        @NotEmpty(message = "Debe enviar al menos un pasajero")
        @Size(max = 20, message = "Demasiados pasajeros") List<PasajeroAsientoRequest> pasajeros
) {
}