package com.transportes.viajes.excepciones;

public class ViajeNoEncontradoException extends RuntimeException {
    public ViajeNoEncontradoException(Long idViaje) {
        super("No se encontró el viaje con id " + idViaje);
    }
}