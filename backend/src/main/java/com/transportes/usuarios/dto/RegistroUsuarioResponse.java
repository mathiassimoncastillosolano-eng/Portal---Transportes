package com.transportes.usuarios.dto;

public record RegistroUsuarioResponse(
    Integer idUsuario,
    String nombres,
    String apellidos,
    String correo
) {
}