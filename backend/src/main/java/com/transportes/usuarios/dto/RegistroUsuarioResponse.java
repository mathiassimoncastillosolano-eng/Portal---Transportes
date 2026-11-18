package com.transportes.usuarios.dto;

/** Respuesta del registro (nunca incluye la contraseña). */
public record RegistroUsuarioResponse(
    Integer idUsuario,
    String nombres,
    String apellidos,
    String correo
) {
}