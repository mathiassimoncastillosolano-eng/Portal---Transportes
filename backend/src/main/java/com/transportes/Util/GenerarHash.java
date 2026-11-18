package com.transportes.Util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utilidad de consola, no forma parte de la API: imprime el hash BCrypt de una contraseña para crear usuarios
 * de prueba a mano en la BD.
 */
public class GenerarHash {

    /** Ejecutar desde el IDE; copiar el hash impreso en usuario.contrasena_hash. */
    public static void main(String[] args) {

        BCryptPasswordEncoder encoder =
                new BCryptPasswordEncoder();

        String hash = encoder.encode("123456");

        System.out.println("Hash generado:");
        System.out.println(hash);
    }
}