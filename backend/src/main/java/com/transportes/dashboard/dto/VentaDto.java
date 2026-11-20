package com.transportes.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Un pasaje vendido, sin datos del pasajero (el Dashboard solo necesita cifras).
 * Los ids van como texto porque así los usa el frontend en sus filtros y rankings.
 *
 * @param viajeId   viaje del pasaje
 * @param fecha     día de la venta
 * @param ingreso   precio del pasaje en soles
 * @param estado    siempre "emitido": solo se envían ventas pagadas y no reembolsadas
 * @param agenciaId agencia de salida del viaje, agrupada por ciudad (id de la ubicación de origen)
 * @param servicioId tipo de bus del viaje (Estándar, Semi Cama, Bus Cama, Prime...)
 * @param origen    ciudad de origen
 * @param destino   ciudad de destino
 */
public record VentaDto(String viajeId, LocalDate fecha, BigDecimal ingreso, String estado, String agenciaId,
        String servicioId, String origen, String destino) {
}
