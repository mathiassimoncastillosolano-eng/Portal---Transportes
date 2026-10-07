package com.transportes.auth.dto;

/** Autorizacion de corta vida para fijar la nueva contrasena. */
public record PruebaRecuperacionResponse(String pruebaRecuperacion, long expiraEnSegundos) {
}
