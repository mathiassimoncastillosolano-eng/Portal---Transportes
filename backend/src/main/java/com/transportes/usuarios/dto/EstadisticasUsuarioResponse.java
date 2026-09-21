package com.transportes.usuarios.dto;

/**
 * Contador de pasajes, viajes y tickets asociados al usuario autenticado.
 *
 * <p>Las funcionalidades de compra de pasajes, historial de viajes y
 * emision de tickets todavia no estan implementadas en el sistema. Por lo
 * tanto, estos valores son actualmente FIJOS en cero: no se realiza ninguna
 * consulta a la base de datos para calcularlos, ya que las tablas
 * correspondientes (viajes, ventas, tickets) aun no existen.</p>
 *
 * <p>Cuando esas funcionalidades se implementen en el futuro, esta clase
 * debera pasar a calcular los valores reales a partir de los repositorios
 * correspondientes.</p>
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

    /**
     * Valores temporales (0, 0, 0) mientras no exista una implementacion
     * real de pasajes, viajes y tickets.
     */
    public static EstadisticasUsuarioResponse temporal() {
        return new EstadisticasUsuarioResponse(0, 0, 0);
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
