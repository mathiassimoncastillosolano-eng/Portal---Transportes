package com.transportes.usuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Datos para cambiar la contraseña estando con sesión iniciada. */
public class CambiarContrasenaRequest {

    @NotBlank(message = "Ingresa tu contraseña actual.")
    private String contrasenaActual;

    @NotBlank(message = "Ingresa la nueva contraseña.")
    @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres.")
    private String contrasenaNueva;

    @NotBlank(message = "Confirma la nueva contraseña.")
    private String confirmacion;

    public String getContrasenaActual() {
        return contrasenaActual;
    }

    public void setContrasenaActual(String contrasenaActual) {
        this.contrasenaActual = contrasenaActual;
    }

    public String getContrasenaNueva() {
        return contrasenaNueva;
    }

    public void setContrasenaNueva(String contrasenaNueva) {
        this.contrasenaNueva = contrasenaNueva;
    }

    public String getConfirmacion() {
        return confirmacion;
    }

    public void setConfirmacion(String confirmacion) {
        this.confirmacion = confirmacion;
    }
}
