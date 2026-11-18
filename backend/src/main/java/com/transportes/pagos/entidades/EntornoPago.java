package com.transportes.pagos.entidades;

/**
 * Entorno de un pago: SANDBOX (pruebas, sin dinero real, solo usuarios autorizados) o PRODUCTION (dinero real). Se
 * fija al crear la operación y nunca cambia: consultas, Webhook, cancelación y reembolso usan siempre las
 * credenciales de ese entorno.
 */
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
