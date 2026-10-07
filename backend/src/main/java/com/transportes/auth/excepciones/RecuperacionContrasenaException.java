package com.transportes.auth.excepciones;

import org.springframework.http.HttpStatus;

/**
 * Error controlado del flujo de recuperacion de contrasena. Lleva el estado HTTP
 * y un mensaje seguro para mostrar al usuario (el manejador global lo traduce a
 * {@code RespuestaError}). Los mensajes no distinguen si una cuenta existe.
 */
public class RecuperacionContrasenaException extends RuntimeException {

    private final HttpStatus status;

    public RecuperacionContrasenaException(HttpStatus status, String mensaje) {
        super(mensaje);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
