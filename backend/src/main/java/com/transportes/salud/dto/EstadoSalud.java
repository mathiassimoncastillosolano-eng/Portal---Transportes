package com.transportes.salud.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Respuesta de la revisión de salud del backend. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EstadoSalud(String status, String fase) {

    public static EstadoSalud de(String status) {
        return new EstadoSalud(status, null);
    }
}
