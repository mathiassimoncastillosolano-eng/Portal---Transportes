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
        // Estado de reserva calculado en el servidor (PoliticaReservaViaje, hora de Perú): DISPONIBLE,
        // RESERVA_CERRADA, SALIDA_REALIZADA, LLENO, SIN_INFORMACION o NO_DISPONIBLE.
        String estadoReserva, boolean reservable,
        // Horas en milisegundos (UTC). El navegador las usa con ahoraServidorMs para actualizar el estado sin
        // depender de su propio reloj; al reservar el backend vuelve a validar.
        long salidaMs, long limiteReservaMs, long ahoraServidorMs, int minutosAnticipacion,
        int capacidad, String terminalOrigen, String terminalDestino, Integer duracionMin) {
}
