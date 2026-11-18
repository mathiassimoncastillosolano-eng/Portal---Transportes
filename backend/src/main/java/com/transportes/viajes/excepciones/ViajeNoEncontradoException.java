package com.transportes.viajes.excepciones;

/** No existe el viaje (404). */
public class ViajeNoEncontradoException extends RuntimeException {
    public ViajeNoEncontradoException(Long idViaje) {
        super("No se encontró el viaje con id " + idViaje);
    }
}