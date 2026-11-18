package com.transportes.auth.excepciones;

/**
 * Choque de cuentas con Google (409): el correo ya tiene una cuenta con contraseña, o esa cuenta de Google ya es
 * de otro usuario.
 */
public class CuentaExistenteException extends RuntimeException {

    public CuentaExistenteException(String mensaje) {
        super(mensaje);
    }
}
