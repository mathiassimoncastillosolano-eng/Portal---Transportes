package com.transportes.auth.dto;

/**
 * Respuesta de {@code POST /api/auth/login}: el JWT y los datos minimos del
 * usuario autenticado.
 */
public class LoginResponse {

    private final String token;
    private final UsuarioResumenResponse usuario;

    public LoginResponse(String token, UsuarioResumenResponse usuario) {
        this.token = token;
        this.usuario = usuario;
    }

    public String getToken() {
        return token;
    }

    public UsuarioResumenResponse getUsuario() {
        return usuario;
    }
}
