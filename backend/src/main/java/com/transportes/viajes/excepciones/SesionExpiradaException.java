package com.transportes.viajes.excepciones;

/** Venció la sesión de reserva (410). */
public class SesionExpiradaException extends RuntimeException {
    public SesionExpiradaException() {
        super("La sesión de reserva expiró");
    }
}