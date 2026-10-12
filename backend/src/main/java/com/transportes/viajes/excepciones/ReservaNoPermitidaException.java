package com.transportes.viajes.excepciones;

/** El viaje ya no admite reservas (salió, falta menos de 20 minutos, está cancelado…). Se responde 409. */
public class ReservaNoPermitidaException extends RuntimeException {
    public ReservaNoPermitidaException(String mensaje) {
        super(mensaje);
    }
}
