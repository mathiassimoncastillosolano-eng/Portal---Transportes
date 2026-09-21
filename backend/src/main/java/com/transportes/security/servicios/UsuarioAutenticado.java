package com.transportes.security.servicios;

/**
 * Representa, dentro del contexto de seguridad de Spring, al usuario que ya
 * fue autenticado mediante un JWT valido. Se establece como "principal" de
 * la {@code Authentication} por el {@code JwtAuthenticationFilter}.
 *
 * Es un registro simple: no vuelve a consultar la base de datos en cada
 * peticion salvo cuando el propio filtro lo necesita para verificar que el
 * usuario siga activo.
 */
public record UsuarioAutenticado(Integer idUsuario, String correo) {
}

