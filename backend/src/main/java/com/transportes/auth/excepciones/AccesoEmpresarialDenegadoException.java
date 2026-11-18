package com.transportes.auth.excepciones;

/** Credenciales correctas, pero la cuenta no es empleado (por ejemplo, un cliente del Portal). Se responde 403. */
public class AccesoEmpresarialDenegadoException extends RuntimeException {

    public AccesoEmpresarialDenegadoException(String mensaje) {
        super(mensaje);
    }
}
