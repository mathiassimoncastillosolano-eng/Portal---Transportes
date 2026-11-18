package com.transportes.viajes.dto;

/** Mensaje SSE: qué asiento cambió y a qué estado. */
public record AsientoEventoDTO(Integer idAsiento, String estado) {
}