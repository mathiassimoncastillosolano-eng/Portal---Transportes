package com.transportes.servicios.dto;

/**
 * Datos de una tarjeta de servicio (tipo de bus): id, nombre (por ejemplo "Económico"), descripción, URL de la
 * imagen y reclinación de los asientos.
 */
public record TipoBusRespuestaDTO(
        Integer idTipoBus,
        String nombreTipo,
        String descripcion,
        String urlImagen,
        String descripcionReclinacion
) {
}
