package com.transportes.auth.dto;

/**
 * Identidad ya verificada de un ID token de Google. {@code googleId} es el
 * claim {@code sub}, el identificador estable de la cuenta. Los campos de
 * nombre pueden ser nulos si Google no los proporciona.
 */
public record IdentidadGoogle(String googleId, String correo, String nombres,
                              String apellidos, String nombreCompleto) {
}
