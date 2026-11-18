package com.transportes.security.servicios;

/** Usuario que hizo la petición: id, correo y rol. */
public record UsuarioAutenticado(Integer idUsuario, String correo, String rol) {
}

