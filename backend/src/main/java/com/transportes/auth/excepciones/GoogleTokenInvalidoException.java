package com.transportes.auth.excepciones;

/**
 * El ID token de Google es invalido, esta expirado, fue emitido para otra
 * aplicacion o el correo de la cuenta de Google no esta verificado. Se
 * responde 401 con un mensaje generico.
 */
public class GoogleTokenInvalidoException extends RuntimeException {

    public GoogleTokenInvalidoException(String mensaje) {
        super(mensaje);
    }

    public GoogleTokenInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
