package com.transportes.compras.dto;

/**
 * Contadores del perfil. Solo cuentan compras CONFIRMADAS.
 * pasajes: pasajes comprados (uno por asiento).
 * viajesCompletados: viajes distintos cuya salida ya pasó.
 * tickets: pasajes cuyo PDF se puede descargar (viaje no cancelado).
 * comprasVigentes: compras con viaje próximo.
 */
public record ResumenPerfilDto(int pasajes, int viajesCompletados, int tickets, int comprasVigentes) {
}
