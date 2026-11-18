package com.transportes.Util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Programa de consola (no es parte de la API): imprime el hash BCrypt de una contraseña para crear usuarios de
 * prueba a mano en la base.
 */
public class GenerarHash {

    /** Se ejecuta desde el IDE; el hash impreso se copia en usuario.contrasena_hash. */
    public static void main(String[] args) {

        BCryptPasswordEncoder encoder =
                new BCryptPasswordEncoder();

        String hash = encoder.encode("123456");

        System.out.println("Hash generado:");
        System.out.println(hash);
    }
}