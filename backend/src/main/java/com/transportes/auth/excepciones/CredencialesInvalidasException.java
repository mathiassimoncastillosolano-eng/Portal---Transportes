package com.transportes.auth.excepciones;

/** Error 401: correo o contraseña incorrectos, o cuenta inactiva. */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}
