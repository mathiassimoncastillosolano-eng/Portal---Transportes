package com.transportes.destinos.dto;

/** Datos de una tarjeta de destino: id de la ubicación, nombre de la ciudad y URL de su imagen. */
public record DestinoRespuestaDTO(
        Long id,
        String ciudad,
        String imagen
) {
}
