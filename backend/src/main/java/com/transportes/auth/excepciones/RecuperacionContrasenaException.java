package com.transportes.auth.excepciones;

import org.springframework.http.HttpStatus;

/**
 * Error del flujo de recuperación con su código HTTP y un mensaje seguro para mostrar (nunca dice si la cuenta
 * existe).
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
