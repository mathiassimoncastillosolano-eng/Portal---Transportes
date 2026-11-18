package com.transportes.viajes.dto;

import java.time.LocalDateTime;

/** Token de la sesión de reserva y cuánto le queda. */
public record SesionReservaResponseDTO(String tokenSesion, LocalDateTime fechaExpiracion, long segundosRestantes) {
}