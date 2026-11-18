package com.transportes.auth.dto;

/**
 * Datos básicos del usuario que acompañan al token (id, nombres, apellidos y correo). El perfil completo se pide
 * aparte en GET /api/usuarios/perfil.
 */
public class UsuarioResumenResponse {

    private final Integer idUsuario;
    private final String nombres;
    private final String apellidos;
    private final String correo;

    public UsuarioResumenResponse(Integer idUsuario, String nombres, String apellidos, String correo) {
        this.idUsuario = idUsuario;
        this.nombres = nombres;
        this.apellidos = apellidos;
        this.correo = correo;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public String getNombres() {
        return nombres;
    }

    public String getApellidos() {
        return apellidos;
    }

    public String getCorreo() {
        return correo;
    }
}
