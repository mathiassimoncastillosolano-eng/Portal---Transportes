package com.transportes.viajes.excepciones;

/** El viaje ya no acepta reservas: salió, faltan menos de 20 minutos o está cancelado (409). */
public class ReservaNoPermitidaException extends RuntimeException {
    public ReservaNoPermitidaException(String mensaje) {
        super(mensaje);
    }
}
