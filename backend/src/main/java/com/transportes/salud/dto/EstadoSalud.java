package com.transportes.salud.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Cuerpo de las respuestas de salud. Deliberadamente mínimo: no expone host, versión,
 * nombres de base de datos ni mensajes de error.
 *
 * @param status UP (liveness) · READY · NOT_READY · DEGRADED (readiness)
 * @param fase   solo cuando no está listo: INICIANDO · DEPENDENCIAS · DETENIENDO
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EstadoSalud(String status, String fase) {

    public static EstadoSalud de(String status) {
        return new EstadoSalud(status, null);
    }
}
