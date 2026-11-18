package com.transportes.viajes.dto;

/** Error en un campo de un pasajero, para marcarlo en el formulario. */
public record ErrorPasajeroDTO(Integer idAsiento, String campo, String mensaje) {
}