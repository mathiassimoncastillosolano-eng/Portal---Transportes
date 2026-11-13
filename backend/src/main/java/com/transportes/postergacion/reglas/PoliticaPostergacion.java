package com.transportes.postergacion.reglas;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * HU-02 · Regla de tiempo para cambiar un pasaje (criterio 2).
 *
 * <p>Patrón: Política (regla pura). No usa Spring ni base de datos, así que se prueba con una hora fija,
 * igual que {@code PoliticaReservaViaje}.</p>
 *
 * <ul>
 *   <li>Se acepta si faltan 6 horas o más para la salida (6 h exactas SÍ se acepta).</li>
 *   <li>Se rechaza si faltan menos de 6 horas o si el viaje ya salió, y se informa el motivo.</li>
 * </ul>
 *
 * <p>Todas las horas son hora de Perú, la misma zona en la que se guardan los viajes.</p>
 */
public final class PoliticaPostergacion {

    public static final int HORAS_MINIMAS = 6;
    public static final Duration ANTICIPACION_MINIMA = Duration.ofHours(HORAS_MINIMAS);

    /** Resultado de evaluar un viaje. Cada rechazo trae el mensaje para el cliente. */
    public enum Resultado {
        ACEPTADO(""),
        VIAJE_YA_SALIO("El viaje ya salió. Ya no se puede cambiar este pasaje."),
        ANTICIPACION_INSUFICIENTE("Solo puedes cambiar tu pasaje hasta " + HORAS_MINIMAS
                + " horas antes de la salida.");

        private final String mensaje;

        Resultado(String mensaje) {
            this.mensaje = mensaje;
        }

        public String mensaje() {
            return mensaje;
        }

        public boolean aceptado() {
            return this == ACEPTADO;
        }
    }

    private PoliticaPostergacion() {
    }

    /** Evalúa si el pasaje de un viaje con esta salida todavía se puede cambiar. */
    public static Resultado evaluar(LocalDate fechaSalida, LocalTime horaSalida, LocalDateTime ahora) {
        LocalDateTime salida = fechaSalida.atTime(horaSalida);
        if (!ahora.isBefore(salida)) {
            return Resultado.VIAJE_YA_SALIO;
        }
        if (!cumpleAnticipacion(salida, ahora)) {
            return Resultado.ANTICIPACION_INSUFICIENTE;
        }
        return Resultado.ACEPTADO;
    }

    /** true si faltan 6 h o más para la salida (6 h exactas cuenta como válido). */
    public static boolean cumpleAnticipacion(LocalDateTime salida, LocalDateTime ahora) {
        LocalDateTime limite = salida.minus(ANTICIPACION_MINIMA);
        return !ahora.isAfter(limite);
    }
}
