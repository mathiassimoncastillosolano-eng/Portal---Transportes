package com.transportes.dashboard.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Opciones de los filtros del Dashboard, sacadas de la base de datos.
 *
 * @param agencias  agencias de salida, una por ciudad (las agencias duplicadas de una ciudad se unen)
 * @param servicios tipos de bus
 * @param destinos  ciudades de destino de las rutas
 * @param hoy       fecha de hoy en Perú, para que el frontend calcule "últimos 7, 30 o 90 días"
 */
public record OpcionesDashboardDto(List<OpcionDto> agencias, List<OpcionDto> servicios, List<String> destinos,
        LocalDate hoy) {
}
