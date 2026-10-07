package com.transportes.auth.excepciones;

import org.springframework.http.HttpStatus;

/** El proveedor de correo no confirmo el envio (error de red, credenciales, dominio, etc.). */
public class CorreoNoDisponibleException extends RecuperacionContrasenaException {

    public CorreoNoDisponibleException() {
        super(HttpStatus.SERVICE_UNAVAILABLE,
                "No pudimos enviar el correo en este momento. Inténtalo de nuevo en unos minutos.");
    }
}
