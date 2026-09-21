package com.transportes.destinos.dto;

/**
 * DTO de salida con la información mínima que necesita una tarjeta de
 * destino del frontend: identificador, nombre de la ciudad e imagen.
 *
 * @param id     Identificador de la ubicación en la base de datos.
 * @param ciudad Nombre de la ubicación, mostrado como ciudad en la tarjeta.
 * @param imagen URL de la imagen de la ubicación.
 */
public record DestinoRespuestaDTO(
        Integer id,
        String ciudad,
        String imagen
) {
}
