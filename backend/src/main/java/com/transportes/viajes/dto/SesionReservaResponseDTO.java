package com.transportes.viajes.dto;

import java.time.LocalDateTime;

public record SesionReservaResponseDTO(String tokenSesion, LocalDateTime fechaExpiracion, long segundosRestantes) {
}