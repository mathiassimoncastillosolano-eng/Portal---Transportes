package com.transportes.pagos.entidades;

/**
 * Entorno de procesamiento de un pago con Mercado Pago.
 *
 * <ul>
 *   <li>{@link #SANDBOX}: credenciales de prueba. No mueve dinero real. Solo para usuarios autorizados.</li>
 *   <li>{@link #PRODUCTION}: credenciales productivas. Cobra dinero real.</li>
 * </ul>
 *
 * El entorno se fija al crear la operación de pago y NUNCA cambia: la consulta de la order, el Webhook, la
 * cancelación y el reembolso usan siempre las credenciales del entorno con el que se creó la operación.
 */
public enum EntornoPago {
    SANDBOX,
    PRODUCTION;

    /** @return el entorno, o null si el texto no es SANDBOX ni PRODUCTION (sin distinguir mayúsculas). */
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

    public boolean esPrueba() {
        return this == SANDBOX;
    }
}
