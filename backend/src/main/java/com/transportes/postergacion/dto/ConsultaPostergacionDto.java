package com.transportes.postergacion.dto;

import java.util.List;

import com.transportes.viajes.dto.ViajeResumenDto;

/** Viajes disponibles para cambiar el pasaje. */
public record ConsultaPostergacionDto(List<ViajeResumenDto> viajes, int ocultos) {
}
