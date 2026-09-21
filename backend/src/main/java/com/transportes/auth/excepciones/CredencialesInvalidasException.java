package com.transportes.auth.excepciones;

/**
 * Se lanza cuando el correo no existe, la contrasena no coincide, o el
 * usuario esta inactivo. Se usa deliberadamente una unica excepcion para
 * los tres casos: el endpoint de login siempre responde 401 con un mensaje
 * generico, para no revelar a un atacante si el correo existe o no en el
 * sistema.
 */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}
