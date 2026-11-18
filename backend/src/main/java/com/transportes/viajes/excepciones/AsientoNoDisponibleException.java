package com.transportes.viajes.excepciones;

/** El asiento ya no está libre (409). */
public class AsientoNoDisponibleException extends RuntimeException {
    public AsientoNoDisponibleException(String mensaje) {
        super(mensaje);
    }
}