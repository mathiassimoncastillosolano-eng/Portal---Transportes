package com.transportes.dashboard.dto;

import java.util.List;

/** Un período del Dashboard: su rango de fechas, los pasajes vendidos y la ocupación de los viajes que ya salieron. */
public record PeriodoDto(RangoDto rango, List<VentaDto> ventas, List<OcupacionViajeDto> viajes) {
}
