package com.transportes.servicios.dto;

/** Datos de un tipo de bus para mostrar en la sección Servicios. */
public record TipoBusRespuestaDTO(
        Integer idTipoBus,
        String nombreTipo,
        String descripcion,
        String urlImagen,
        String descripcionReclinacion
) {
}
