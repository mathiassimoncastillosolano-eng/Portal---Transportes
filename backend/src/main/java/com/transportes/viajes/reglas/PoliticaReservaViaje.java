package com.transportes.viajes.reglas;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Regla de reserva de un viaje: solo se puede reservar si faltan AL MENOS 20 minutos para la salida (con salida a
 * las 08:00 se puede hasta las 07:40 inclusive). Patrón Regla pura: sin Spring ni base de datos, se prueba con un
 * reloj fijo. Siempre compara fecha + hora completas en hora de Perú, así funciona bien al cruzar la medianoche.
 */
public final class PoliticaReservaViaje {

    public static final ZoneId ZONA_NEGOCIO = ZoneId.of("America/Lima");
    public static final int MINUTOS_ANTICIPACION = 20;
    public static final Duration ANTICIPACION_MINIMA = Duration.ofMinutes(MINUTOS_ANTICIPACION);
    /** Único estado de viaje que acepta reservas; cualquier otro (por ejemplo CANCELADO) las bloquea. */
    public static final String ESTADO_VIAJE_RESERVABLE = "PROGRAMADO";

    /** Estado de reserva de un viaje. Están en orden de prioridad: gana el primero que se cumple. */
    public enum EstadoReserva {
        /** El viaje no está PROGRAMADO (cancelado, suspendido...). */
        NO_DISPONIBLE,
        /** La hora de salida ya llegó o pasó. */
        SALIDA_REALIZADA,
        /** Tiene asientos registrados, pero ninguno disponible. */
        LLENO,
        /** El viaje no tiene asientos registrados: no se puede decir si está lleno ni reservar. */
        SIN_INFORMACION,
        /** Todavía no sale, pero faltan menos de 20 minutos. */
        RESERVA_CERRADA,
        /** Se puede reservar. */
        DISPONIBLE;

        public boolean reservable() {
            return this == DISPONIBLE;
        }
    }

    private PoliticaReservaViaje() {
    }

    /** Junta fecha y hora de salida. */
    public static LocalDateTime salida(LocalDate fechaSalida, LocalTime horaSalida) {
        return LocalDateTime.of(fechaSalida, horaSalida);
    }

    /** Última hora a la que se puede reservar (inclusive): salida menos 20 minutos. */
    public static LocalDateTime limiteReserva(LocalDate fechaSalida, LocalTime horaSalida) {
        return salida(fechaSalida, horaSalida).minus(ANTICIPACION_MINIMA);
    }

    /** true si ahora es antes o igual a salida menos 20 minutos. No mira asientos ni estado del viaje. */
    public static boolean cumpleAnticipacion(LocalDate fechaSalida, LocalTime horaSalida, LocalDateTime ahora) {
        return !ahora.isAfter(limiteReserva(fechaSalida, horaSalida));
    }

    /** true si la hora de salida ya llegó. */
    public static boolean yaSalio(LocalDate fechaSalida, LocalTime horaSalida, LocalDateTime ahora) {
        return !ahora.isBefore(salida(fechaSalida, horaSalida));
    }

    /**
     * Calcula el estado de reserva del viaje.
     * @param totalAsientos asientos registrados del viaje (0 = sin información)
     * @param asientosDisponibles asientos libres ahora
     * @param ahora hora actual de Perú
     */
    public static EstadoReserva evaluar(String estadoViaje, LocalDate fechaSalida, LocalTime horaSalida,
                                        int totalAsientos, int asientosDisponibles, LocalDateTime ahora) {
        if (!ESTADO_VIAJE_RESERVABLE.equals(estadoViaje)) return EstadoReserva.NO_DISPONIBLE;
        if (yaSalio(fechaSalida, horaSalida, ahora)) return EstadoReserva.SALIDA_REALIZADA;
        if (totalAsientos <= 0) return EstadoReserva.SIN_INFORMACION;
        if (asientosDisponibles <= 0) return EstadoReserva.LLENO;
        if (!cumpleAnticipacion(fechaSalida, horaSalida, ahora)) return EstadoReserva.RESERVA_CERRADA;
        return EstadoReserva.DISPONIBLE;
    }

    /**
     * Convierte una fecha y hora de Perú a milisegundos UTC, para que el navegador no dependa de su zona horaria.
     */
    public static long aEpochMs(LocalDateTime local) {
        return local.atZone(ZONA_NEGOCIO).toInstant().toEpochMilli();
    }

    /** Mensaje para el usuario cuando se rechaza una reserva por tiempo. */
    public static String mensajeRechazo(EstadoReserva estado) {
        return switch (estado) {
            case SALIDA_REALIZADA -> "Este bus ya salió. Ya no se pueden reservar pasajes para este viaje.";
            case RESERVA_CERRADA -> "La reserva para este viaje está cerrada: se requiere reservar con al menos "
                    + MINUTOS_ANTICIPACION + " minutos de anticipación.";
            case NO_DISPONIBLE -> "Este viaje no está disponible para reservas.";
            case LLENO -> "Este viaje no tiene asientos disponibles.";
            case SIN_INFORMACION -> "No hay información de asientos para este viaje.";
            case DISPONIBLE -> "";
        };
    }
}
