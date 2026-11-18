package com.transportes.salud.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Respuesta de salud, mínima a propósito (sin host, versión ni errores).
 * @param status UP (live), READY, NOT_READY o DEGRADED (ready)
 * @param fase solo si no está listo: INICIANDO, DEPENDENCIAS o DETENIENDO
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EstadoSalud(String status, String fase) {

    public static EstadoSalud de(String status) {
        return new EstadoSalud(status, null);
    }
}
