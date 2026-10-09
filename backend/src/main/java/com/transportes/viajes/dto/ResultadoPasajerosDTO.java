package com.transportes.viajes.dto;

import java.util.List;

public record ResultadoPasajerosDTO(boolean valido, List<ErrorPasajeroDTO> errores) {

    public static ResultadoPasajerosDTO ok() {
        return new ResultadoPasajerosDTO(true, List.of());
    }

    public static ResultadoPasajerosDTO conErrores(List<ErrorPasajeroDTO> errores) {
        return new ResultadoPasajerosDTO(false, List.copyOf(errores));
    }
}