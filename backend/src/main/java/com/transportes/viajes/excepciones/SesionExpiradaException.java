package com.transportes.viajes.excepciones;

public class SesionExpiradaException extends RuntimeException {
    public SesionExpiradaException() {
        super("La sesión de reserva expiró");
    }
}