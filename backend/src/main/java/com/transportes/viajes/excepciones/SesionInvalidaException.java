package com.transportes.viajes.excepciones;

/** Token de sesión falso, alterado o de otro viaje (401). */
public class SesionInvalidaException extends RuntimeException {
    public SesionInvalidaException(String mensaje) {
        super(mensaje);
    }
}