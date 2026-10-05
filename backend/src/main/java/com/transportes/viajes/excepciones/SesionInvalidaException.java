package com.transportes.viajes.excepciones;

public class SesionInvalidaException extends RuntimeException {
    public SesionInvalidaException(String mensaje) {
        super(mensaje);
    }
}