package com.transportes.usuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Datos que el usuario autenticado puede modificar en su propio perfil.
 *
 * Deliberadamente NO incluye {@code correo}, {@code contrasena}, {@code activo}
 * ni {@code idUsuario}: al no existir esos campos en este DTO, es imposible
 * que el frontend los modifique a traves de este endpoint, incluso si los
 * envia en el cuerpo de la peticion.
 */
public class ActualizarPerfilRequest {

    @NotBlank(message = "Los nombres son obligatorios.")
    @Size(max = 100, message = "Los nombres no pueden superar los 100 caracteres.")
    private String nombres;

    @NotBlank(message = "Los apellidos son obligatorios.")
    @Size(max = 100, message = "Los apellidos no pueden superar los 100 caracteres.")
    private String apellidos;

    @Pattern(regexp = "^$|^[0-9+\\s-]{6,20}$", message = "El numero de telefono no tiene un formato valido.")
    private String nroTelefono;

    public String getNombres() {
        return nombres;
    }

    public void setNombres(String nombres) {
        this.nombres = nombres;
    }

    public String getApellidos() {
        return apellidos;
    }

    public void setApellidos(String apellidos) {
        this.apellidos = apellidos;
    }

    public String getNroTelefono() {
        return nroTelefono;
    }

    public void setNroTelefono(String nroTelefono) {
        this.nroTelefono = nroTelefono;
    }
}
