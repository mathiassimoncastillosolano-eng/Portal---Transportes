package com.transportes.auth.dto;

/** Respuesta del login del Portal: el JWT y los datos básicos del usuario. */
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
