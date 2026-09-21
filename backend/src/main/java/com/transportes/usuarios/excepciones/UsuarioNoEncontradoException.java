package com.transportes.usuarios.excepciones;

/**
 * Se lanza cuando no se encuentra un usuario para el identificador o correo
 * solicitado. Se traduce a una respuesta HTTP 404 por el manejador global
 * de excepciones (ver {@code com.transportes.configuracion.excepciones}).
 */
public class UsuarioNoEncontradoException extends RuntimeException {

    public UsuarioNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
