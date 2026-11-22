package com.transportes.postergacion.dto;

/**
 * Respuesta de "¿se puede cambiar este pasaje?" para el personal de agencia.
 * Si elegible es false, codigo y motivo explican por qué (por ejemplo ANTICIPACION_INSUFICIENTE).
 */
public record ElegibilidadCambioDto(boolean elegible, String codigo, String motivo) {

    /** El pasaje sí se puede cambiar. */
    public static ElegibilidadCambioDto aceptada() {
        return new ElegibilidadCambioDto(true, null, null);
    }

    /** El pasaje no se puede cambiar, con el código y el motivo. */
    public static ElegibilidadCambioDto rechazada(String codigo, String motivo) {
        return new ElegibilidadCambioDto(false, codigo, motivo);
    }
}
