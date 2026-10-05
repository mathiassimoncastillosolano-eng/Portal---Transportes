package com.transportes.auth.excepciones;

/**
 * No se pudo contactar a Google para obtener sus claves publicas de
 * verificacion. Se responde 503; el usuario puede reintentar.
 */
public class GoogleServicioNoDisponibleException extends RuntimeException {

    public GoogleServicioNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
