package com.transportes.auth.excepciones;

/** No se pudieron descargar las claves públicas de Google. Se responde 503 y el usuario puede reintentar. */
public class GoogleServicioNoDisponibleException extends RuntimeException {

    public GoogleServicioNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
