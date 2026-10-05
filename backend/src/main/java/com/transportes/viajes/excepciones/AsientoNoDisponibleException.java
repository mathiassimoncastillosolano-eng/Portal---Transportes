package com.transportes.viajes.excepciones;

public class AsientoNoDisponibleException extends RuntimeException {
    public AsientoNoDisponibleException(String mensaje) {
        super(mensaje);
    }
}