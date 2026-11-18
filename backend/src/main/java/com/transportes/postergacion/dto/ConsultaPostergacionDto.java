package com.transportes.postergacion.dto;

import java.util.List;

import com.transportes.viajes.dto.ViajeResumenDto;

/**
 * Respuesta de la consulta de viajes para cambiar un pasaje.
 * @param viajes todos los viajes de esa ruta y fecha menos el original, con el mismo formato que
 * /api/viajes/buscar (cada uno trae estadoReserva y reservable)
 * @param ocultos cuántos viajes se ocultaron (solo el original: 0 o 1)
 */
public record ConsultaPostergacionDto(List<ViajeResumenDto> viajes, int ocultos) {
}
