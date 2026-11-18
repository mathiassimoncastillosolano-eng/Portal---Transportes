package com.transportes.security.servicios;

/**
 * El usuario de la petición actual, ya validado por el JWT. El filtro lo deja como "principal" de Spring y los
 * controladores lo reciben con @AuthenticationPrincipal. Guarda id, correo y rol (AGENCIA, GERENTE o CLIENTE).
 */
public record UsuarioAutenticado(Integer idUsuario, String correo, String rol) {
}

