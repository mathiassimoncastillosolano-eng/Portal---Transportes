package com.transportes.viajes.reglas;

import java.time.LocalTime;
import java.util.Locale;
import java.util.Optional;

/**
 * Franjas del filtro de horario (en minutos del día): madrugada 0-6 h, mañana 6-12 h, tarde 12-18 h y noche 18-24
 * h.
 */
public enum FranjaHorario {
    MADRUGADA("madrugada", 0, 360),
    MANANA("manana", 360, 720),
    TARDE("tarde", 720, 1080),
    NOCHE("noche", 1080, 1440);

    private final String id;
    private final int desdeMinuto;
    private final int hastaMinuto;

    FranjaHorario(String id, int desdeMinuto, int hastaMinuto) {
        this.id = id;
        this.desdeMinuto = desdeMinuto;
        this.hastaMinuto = hastaMinuto;
    }

    public String id() {
        return id;
    }

    public int desdeMinuto() {
        return desdeMinuto;
    }

    public int hastaMinuto() {
        return hastaMinuto;
    }

    /** true si la hora cae en la franja (incluye el inicio, no el fin). */
    public boolean contiene(LocalTime hora) {
        int minuto = hora.getHour() * 60 + hora.getMinute();
        return minuto >= desdeMinuto && minuto < hastaMinuto;
    }

    /** Convierte el texto de la URL ("manana", "tarde"...) en una franja. */
    public static Optional<FranjaHorario> desdeId(String valor) {
        if (valor == null) {
            return Optional.empty();
        }
        String limpio = valor.trim().toLowerCase(Locale.ROOT).replace("ñ", "n");
        for (FranjaHorario franja : values()) {
            if (franja.id.equals(limpio)) {
                return Optional.of(franja);
            }
        }
        return Optional.empty();
    }
}
