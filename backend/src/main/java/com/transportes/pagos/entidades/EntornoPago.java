package com.transportes.pagos.entidades;

/** Entorno del pago: SANDBOX (prueba) o PRODUCTION (dinero real). */
public enum EntornoPago {
    SANDBOX,
    PRODUCTION;

    /** Convierte el texto en entorno (sin importar mayúsculas). Devuelve null si no es SANDBOX ni PRODUCTION. */
    public static EntornoPago desde(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.strip();
        for (EntornoPago entorno : values()) {
            if (entorno.name().equalsIgnoreCase(limpio)) {
                return entorno;
            }
        }
        return null;
    }

    /** true si es SANDBOX. */
    public boolean esPrueba() {
        return this == SANDBOX;
    }
}
