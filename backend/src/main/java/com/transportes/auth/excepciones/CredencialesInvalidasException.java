package com.transportes.auth.excepciones;

/**
 * Login fallido (401): correo inexistente, contraseña incorrecta o usuario inactivo. Correo y contraseña dan el
 * mismo mensaje a propósito, para no revelar si el correo existe; la cuenta inactiva tiene su propio mensaje.
 */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}
