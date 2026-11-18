package com.transportes.auth.dto;

/** Respuesta del paso 1. Es igual exista o no la cuenta, para no revelar qué correos están registrados. */
public record SolicitudRecuperacionResponse(String mensaje, int expiraEnMinutos, int reenvioEnSegundos) {
}
