package com.transportes.postergacion.dto;

import java.util.List;

import com.transportes.viajes.dto.ViajeResumenDto;

/**
 * Respuesta de la consulta de viajes para cambiar un pasaje.
 *
 * @param viajes  viajes que se pueden elegir (mismo formato que {@code GET /api/viajes/buscar})
 * @param ocultos cuántos viajes de esa ruta y fecha no se ofrecen (llenos, muy pronto o el mismo viaje)
 */
public record ConsultaPostergacionDto(List<ViajeResumenDto> viajes, int ocultos) {
}
