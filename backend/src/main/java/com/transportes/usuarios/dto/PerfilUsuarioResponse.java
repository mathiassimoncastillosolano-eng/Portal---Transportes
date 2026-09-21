package com.transportes.usuarios.dto;

/**
 * Datos del usuario autenticado devueltos por {@code GET /api/usuarios/perfil}.
 * Nunca incluye {@code contrasenaHash} ni ningun otro dato sensible.
 */
public class PerfilUsuarioResponse {

    private final Integer idUsuario;
    private final String nombres;
    private final String apellidos;
    private final String correo;
    private final String nroTelefono;
    private final EstadisticasUsuarioResponse estadisticas;

    public PerfilUsuarioResponse(Integer idUsuario, String nombres, String apellidos,
                                  String correo, String nroTelefono,
                                  EstadisticasUsuarioResponse estadisticas) {
        this.idUsuario = idUsuario;
        this.nombres = nombres;
        this.apellidos = apellidos;
        this.correo = correo;
        this.nroTelefono = nroTelefono;
        this.estadisticas = estadisticas;
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

    public String getNroTelefono() {
        return nroTelefono;
    }

    public EstadisticasUsuarioResponse getEstadisticas() {
        return estadisticas;
    }
}
