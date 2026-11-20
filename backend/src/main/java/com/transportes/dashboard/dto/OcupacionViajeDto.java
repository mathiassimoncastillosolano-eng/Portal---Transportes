package com.transportes.dashboard.dto;

/** Ocupación de un viaje que ya salió: cuántos asientos tiene y cuántos quedaron ocupados. */
public record OcupacionViajeDto(String viajeId, int capacidad, int vendidos) {
}
