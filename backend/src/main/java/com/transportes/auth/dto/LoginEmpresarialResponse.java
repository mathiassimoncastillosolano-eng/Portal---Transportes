package com.transportes.auth.dto;

/** Respuesta del login del Sistema Empresarial: JWT, datos de la cuenta, rol (AGENCIA o GERENTE) y sede. */
public class LoginEmpresarialResponse {

    private final String token;
    private final UsuarioResumenResponse usuario;
    private final String rol;
    private final Long idAgencia;
    private final String nombreAgencia;

    public LoginEmpresarialResponse(String token, UsuarioResumenResponse usuario,
                                    String rol, Long idAgencia, String nombreAgencia) {
        this.token = token;
        this.usuario = usuario;
        this.rol = rol;
        this.idAgencia = idAgencia;
        this.nombreAgencia = nombreAgencia;
    }

    public String getToken() {
        return token;
    }

    public UsuarioResumenResponse getUsuario() {
        return usuario;
    }

    public String getRol() {
        return rol;
    }

    public Long getIdAgencia() {
        return idAgencia;
    }

    public String getNombreAgencia() {
        return nombreAgencia;
    }
}
