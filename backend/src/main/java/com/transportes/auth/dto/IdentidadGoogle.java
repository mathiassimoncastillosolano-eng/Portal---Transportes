package com.transportes.auth.dto;

/**
 * Datos de la cuenta de Google ya verificados. googleId es el identificador fijo de la cuenta (claim "sub");
 * nombres y apellidos pueden venir vacíos.
 */
public record IdentidadGoogle(String googleId, String correo, String nombres,
                              String apellidos, String nombreCompleto) {
}
