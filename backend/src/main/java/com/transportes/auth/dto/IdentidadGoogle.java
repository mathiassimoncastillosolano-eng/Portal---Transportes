package com.transportes.auth.dto;

/** Datos de la cuenta de Google ya verificados (id, correo, nombres y apellidos). */
public record IdentidadGoogle(String googleId, String correo, String nombres,
                              String apellidos, String nombreCompleto) {
}
