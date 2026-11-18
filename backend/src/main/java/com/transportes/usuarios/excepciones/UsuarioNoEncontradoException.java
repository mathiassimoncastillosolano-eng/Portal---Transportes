package com.transportes.usuarios.excepciones;

/** No existe un usuario con ese id o correo. El manejador global la convierte en 404. */
public class UsuarioNoEncontradoException extends RuntimeException {

    public UsuarioNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
