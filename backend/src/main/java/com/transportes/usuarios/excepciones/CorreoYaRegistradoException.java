package com.transportes.usuarios.excepciones;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** El correo ya tiene cuenta (se responde 409). */
@ResponseStatus(HttpStatus.CONFLICT)
public class CorreoYaRegistradoException extends RuntimeException {

    public CorreoYaRegistradoException() {
        super("El correo ya está registrado");
    }
}