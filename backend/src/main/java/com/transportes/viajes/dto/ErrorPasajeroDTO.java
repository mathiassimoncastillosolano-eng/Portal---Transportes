package com.transportes.viajes.dto;

/** Error de un campo de un pasajero (para pintarlo en el formulario). */
public record ErrorPasajeroDTO(Integer idAsiento, String campo, String mensaje) {
}