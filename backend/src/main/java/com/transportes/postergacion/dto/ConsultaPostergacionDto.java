package com.transportes.postergacion.dto;

import java.util.List;

import com.transportes.viajes.dto.ViajeResumenDto;

/**
 * Respuesta de la consulta de viajes para cambiar un pasaje.
 *
 * @param viajes  todos los viajes de esa ruta y fecha, menos el original (mismo formato que
 *                {@code GET /api/viajes/buscar}: cada uno trae {@code estadoReserva} y {@code reservable})
 * @param ocultos cuántos viajes no se muestran (solo el viaje original del pasaje: 0 o 1)
 */
public record ConsultaPostergacionDto(List<ViajeResumenDto> viajes, int ocultos) {
}
