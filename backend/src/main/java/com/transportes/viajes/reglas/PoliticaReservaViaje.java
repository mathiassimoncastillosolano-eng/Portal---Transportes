package com.transportes.viajes.reglas;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Regla de negocio de reservas por viaje. Clase pura (sin Spring ni BD) para poder probarla con relojes fijos.
 *
 * <p>Un viaje solo se puede reservar si faltan AL MENOS {@value #MINUTOS_ANTICIPACION} minutos para su salida.
 * La hora límite es inclusiva: con salida a las 08:00 se puede reservar hasta las 07:40:00.000 (inclusive).</p>
 *
 * <p>Todas las fechas y horas de los viajes son hora local de Perú ({@link #ZONA_NEGOCIO}); la comparación se
 * hace siempre con fecha + hora completas (nunca solo con la hora del día), así que cruzar la medianoche o
 * consultar un viaje de un día anterior da el resultado correcto.</p>
 */
public final class PoliticaReservaViaje {

    public static final ZoneId ZONA_NEGOCIO = ZoneId.of("America/Lima");
    public static final int MINUTOS_ANTICIPACION = 20;
    public static final Duration ANTICIPACION_MINIMA = Duration.ofMinutes(MINUTOS_ANTICIPACION);
    /** Único estado de viaje que admite reservas; cualquier otro (p. ej. CANCELADO) las bloquea. */
    public static final String ESTADO_VIAJE_RESERVABLE = "PROGRAMADO";

    /** Estado de reserva de un viaje, en orden de prioridad de presentación (el primero que aplica gana). */
    public enum EstadoReserva {
        /** Estado administrativo distinto de PROGRAMADO (cancelado, suspendido…). */
        NO_DISPONIBLE,
        /** La hora de salida ya llegó o pasó. */
        SALIDA_REALIZADA,
        /** El viaje tiene asientos registrados pero ninguno disponible. */
        LLENO,
        /** No hay asientos registrados para el viaje: no se puede afirmar que esté lleno ni reservar. */
        SIN_INFORMACION,
        /** Aún no salió, pero faltan menos de 20 minutos. */
        RESERVA_CERRADA,
        /** Se puede reservar. */
        DISPONIBLE;

        public boolean reservable() {
            return this == DISPONIBLE;
        }
    }

    private PoliticaReservaViaje() {
    }

    public static LocalDateTime salida(LocalDate fechaSalida, LocalTime horaSalida) {
        return LocalDateTime.of(fechaSalida, horaSalida);
    }

    /** Última hora a la que todavía se puede reservar (inclusive): salida − 20 minutos. */
    public static LocalDateTime limiteReserva(LocalDate fechaSalida, LocalTime horaSalida) {
        return salida(fechaSalida, horaSalida).minus(ANTICIPACION_MINIMA);
    }

    /** true si {@code ahora <= salida − 20 min}. No mira asientos ni estado administrativo. */
    public static boolean cumpleAnticipacion(LocalDate fechaSalida, LocalTime horaSalida, LocalDateTime ahora) {
        return !ahora.isAfter(limiteReserva(fechaSalida, horaSalida));
    }

    /** true si la salida programada ya llegó ({@code ahora >= salida}). */
    public static boolean yaSalio(LocalDate fechaSalida, LocalTime horaSalida, LocalDateTime ahora) {
        return !ahora.isBefore(salida(fechaSalida, horaSalida));
    }

    /**
     * @param totalAsientos       asientos registrados para el viaje (0 = sin información de disponibilidad)
     * @param asientosDisponibles asientos que se pueden reservar ahora
     * @param ahora               hora actual en {@link #ZONA_NEGOCIO}
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

    /** Milisegundos desde epoch (UTC) de una fecha-hora local de Perú; para que el navegador no dependa de su zona. */
    public static long aEpochMs(LocalDateTime local) {
        return local.atZone(ZONA_NEGOCIO).toInstant().toEpochMilli();
    }

    /** Mensaje para el usuario cuando una reserva se rechaza por tiempo (no por asientos). */
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
