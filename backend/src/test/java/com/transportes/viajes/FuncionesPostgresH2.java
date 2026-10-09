package com.transportes.viajes;

/** Sustitutos en H2 de funciones de PostgreSQL (se registran como ALIAS en schema-reserva-test.sql). */
public final class FuncionesPostgresH2 {

    private FuncionesPostgresH2() {
    }

    public static int hashtext(String valor) {
        return valor == null ? 0 : valor.hashCode();
    }

    /** El candado real no hace falta en pruebas de un solo hilo; devuelve un valor para poder usarse en SELECT. */
    public static int pgAdvisoryXactLock(int clave) {
        return 1;
    }
}
