package com.transportes.auth.excepciones;

/**
 * El ID token de Google no sirve: firma mala, vencido, emitido para otra aplicación o correo no verificado. Se
 * responde 401.
 */
public class GoogleTokenInvalidoException extends RuntimeException {

    public GoogleTokenInvalidoException(String mensaje) {
        super(mensaje);
    }

    public GoogleTokenInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
