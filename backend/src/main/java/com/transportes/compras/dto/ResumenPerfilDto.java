package com.transportes.compras.dto;

/** Contadores del perfil: pasajes, viajes completados, tickets y compras vigentes. */
public record ResumenPerfilDto(int pasajes, int viajesCompletados, int tickets, int comprasVigentes) {
}
