package com.transportes.servicios.dto;

/**
 * DTO de salida con la información mínima que necesita una tarjeta de
 * servicio del frontend: identificador, nombre, descripción, imagen y
 * la característica de reclinación. No expone la fecha de creación,
 * ya que el frontend no la necesita.
 *
 * @param idTipoBus              Identificador del tipo de bus en la base de datos.
 * @param nombreTipo             Nombre del tipo de bus (p. ej. "Económico").
 * @param descripcion            Descripción breve del tipo de bus.
 * @param urlImagen              URL de la imagen representativa del tipo de bus.
 * @param descripcionReclinacion Característica de reclinación mostrada en la tarjeta.
 */
public record TipoBusRespuestaDTO(
        Integer idTipoBus,
        String nombreTipo,
        String descripcion,
        String urlImagen,
        String descripcionReclinacion
) {
}
