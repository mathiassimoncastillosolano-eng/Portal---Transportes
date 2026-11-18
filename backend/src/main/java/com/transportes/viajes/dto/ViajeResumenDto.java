package com.transportes.viajes.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Un viaje en la lista de resultados de búsqueda. */
public record ViajeResumenDto(
        Long id, String empresa, String origen, String destino,
        LocalDate fechaSalida, String horaSalida, String horaLlegada,
        LocalDate fechaLlegada, String duracion, String tipoBus,
        List<String> servicios, int asientosDisponibles, BigDecimal precio, String estado,
        // Estado de reserva del viaje y si se puede reservar.
        String estadoReserva, boolean reservable,
        // Horas en milisegundos para que el navegador calcule el estado.
        long salidaMs, long limiteReservaMs, long ahoraServidorMs, int minutosAnticipacion,
        int capacidad, String terminalOrigen, String terminalDestino, Integer duracionMin) {
}
