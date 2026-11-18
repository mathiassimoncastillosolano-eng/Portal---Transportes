package com.transportes.viajes.dto;

import java.util.List;

/** Resultado de validar pasajeros: válido o la lista de errores. */
public record ResultadoPasajerosDTO(boolean valido, List<ErrorPasajeroDTO> errores) {

    public static ResultadoPasajerosDTO ok() {
        return new ResultadoPasajerosDTO(true, List.of());
    }

    public static ResultadoPasajerosDTO conErrores(List<ErrorPasajeroDTO> errores) {
        return new ResultadoPasajerosDTO(false, List.copyOf(errores));
    }
}