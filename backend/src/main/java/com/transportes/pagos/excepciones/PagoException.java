package com.transportes.pagos.excepciones;

import org.springframework.http.HttpStatus;

/** Error del flujo de pago con su código HTTP y un mensaje seguro para mostrar al usuario. */
public class PagoException extends RuntimeException {

    private final HttpStatus status;

    public PagoException(HttpStatus status, String mensaje) {
        super(mensaje);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
