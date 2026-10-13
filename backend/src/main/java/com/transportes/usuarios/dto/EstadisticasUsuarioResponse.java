package com.transportes.usuarios.dto;

import com.transportes.compras.dto.ResumenPerfilDto;

/**
 * Contadores de pasajes, viajes y tickets del usuario autenticado, calculados a partir de sus compras reales
 * (ver {@link ResumenPerfilDto} para el criterio de cada indicador).
 *
 * <p>Se conserva la forma {@code {pasajes, viajes, tickets}} que ya consume el frontend dentro del perfil.
 */
public class EstadisticasUsuarioResponse {

    private final int pasajes;
    private final int viajes;
    private final int tickets;

    private EstadisticasUsuarioResponse(int pasajes, int viajes, int tickets) {
        this.pasajes = pasajes;
        this.viajes = viajes;
        this.tickets = tickets;
    }

    public static EstadisticasUsuarioResponse de(ResumenPerfilDto resumen) {
        return new EstadisticasUsuarioResponse(resumen.pasajes(), resumen.viajesCompletados(), resumen.tickets());
    }

    public int getPasajes() {
        return pasajes;
    }

    public int getViajes() {
        return viajes;
    }

    public int getTickets() {
        return tickets;
    }
}
