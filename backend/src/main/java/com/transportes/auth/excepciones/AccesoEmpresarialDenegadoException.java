package com.transportes.auth.excepciones;

/** Error 403: la cuenta existe pero no es de un empleado. */
public class AccesoEmpresarialDenegadoException extends RuntimeException {

    public AccesoEmpresarialDenegadoException(String mensaje) {
        super(mensaje);
    }
}
