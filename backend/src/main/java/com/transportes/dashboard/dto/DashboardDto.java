package com.transportes.dashboard.dto;

/**
 * Respuesta del Dashboard del gerente: los hechos de venta del período consultado y del período anterior de igual
 * duración (para calcular las variaciones). El frontend suma estos hechos para armar KPIs, gráficos y rankings.
 */
public record DashboardDto(PeriodoDto actual, PeriodoDto anterior) {
}
