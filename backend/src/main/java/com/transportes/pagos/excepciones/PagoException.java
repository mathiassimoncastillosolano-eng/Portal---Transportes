package com.transportes.pagos.excepciones;

import org.springframework.http.HttpStatus;

/** Error de negocio del flujo de pago con un estado HTTP y un mensaje seguro para el usuario. */
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
