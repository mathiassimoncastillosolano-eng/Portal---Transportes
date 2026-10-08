package com.transportes.auth.dto;

/** Respuesta generica: idéntica exista o no la cuenta. */
public record SolicitudRecuperacionResponse(String mensaje, int expiraEnMinutos, int reenvioEnSegundos) {
}
