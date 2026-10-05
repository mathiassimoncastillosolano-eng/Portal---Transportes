package com.transportes.auth.excepciones;

/**
 * Conflicto de cuentas al entrar con Google: el correo ya pertenece a una
 * cuenta con contrasena (no se vincula automaticamente), o la cuenta de
 * Google ya esta asociada a otro usuario. Se responde 409.
 */
public class CuentaExistenteException extends RuntimeException {

    public CuentaExistenteException(String mensaje) {
        super(mensaje);
    }
}
