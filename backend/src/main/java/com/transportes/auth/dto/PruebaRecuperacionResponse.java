package com.transportes.auth.dto;

/** Respuesta del paso 2: la prueba firmada que autoriza el cambio de contraseña y en cuántos segundos vence. */
public record PruebaRecuperacionResponse(String pruebaRecuperacion, long expiraEnSegundos) {
}
