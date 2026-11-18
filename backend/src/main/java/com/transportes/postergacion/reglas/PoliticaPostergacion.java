package com.transportes.postergacion.reglas;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Regla de tiempo de HU-02 (criterio 2): un pasaje se puede cambiar si faltan 6 horas o más para la salida de su
 * viaje original (6 h exactas sí vale). Si faltan menos o el viaje ya salió, se rechaza con el motivo. Patrón
 * Política (regla pura): sin Spring ni base de datos, se prueba con una hora fija. Todas las horas son de Perú.
 */
public final class PoliticaPostergacion {

    public static final int HORAS_MINIMAS = 6;
    public static final Duration ANTICIPACION_MINIMA = Duration.ofHours(HORAS_MINIMAS);

    /** Resultado de la evaluación. Cada rechazo trae su mensaje para el cliente. */
    public enum Resultado {
        ACEPTADO(""),
        VIAJE_YA_SALIO("El viaje ya salió. Ya no se puede cambiar este pasaje."),
        ANTICIPACION_INSUFICIENTE("Solo puedes cambiar tu pasaje hasta " + HORAS_MINIMAS
                + " horas antes de la salida.");

        private final String mensaje;

        Resultado(String mensaje) {
            this.mensaje = mensaje;
        }

        /** Mensaje para el cliente. */
        public String mensaje() {
            return mensaje;
        }

        /** true solo si se cumple la regla de 6 h. */
        public boolean aceptado() {
            return this == ACEPTADO;
        }
    }

    private PoliticaPostergacion() {
    }

    /** Evalúa si un pasaje con esta fecha y hora de salida todavía se puede cambiar. */
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

    /** true si faltan 6 h o más para la salida. */
    public static boolean cumpleAnticipacion(LocalDateTime salida, LocalDateTime ahora) {
        LocalDateTime limite = salida.minus(ANTICIPACION_MINIMA);
        return !ahora.isAfter(limite);
    }
}
