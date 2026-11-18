package com.transportes.auth.excepciones;

import org.springframework.http.HttpStatus;

/** El servicio de correo (Resend) no confirmó el envío. El código generado se anula. */
public class CorreoNoDisponibleException extends RecuperacionContrasenaException {

    public CorreoNoDisponibleException() {
        super(HttpStatus.SERVICE_UNAVAILABLE,
                "No pudimos enviar el correo en este momento. Inténtalo de nuevo en unos minutos.");
    }
}
