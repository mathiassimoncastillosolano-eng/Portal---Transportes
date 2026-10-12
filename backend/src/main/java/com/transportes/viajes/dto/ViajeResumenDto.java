package com.transportes.viajes.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ViajeResumenDto(
        Long id, String empresa, String origen, String destino,
        LocalDate fechaSalida, String horaSalida, String horaLlegada,
        LocalDate fechaLlegada, String duracion, String tipoBus,
        List<String> servicios, int asientosDisponibles, BigDecimal precio, String estado,
        // Reserva (regla de PoliticaReservaViaje, calculada en el servidor con la hora de Perú):
        // estadoReserva = DISPONIBLE | RESERVA_CERRADA | SALIDA_REALIZADA | LLENO | SIN_INFORMACION | NO_DISPONIBLE.
        String estadoReserva, boolean reservable,
        // Instantes en ms desde epoch (UTC). El navegador los usa con ahoraServidorMs para refrescar el estado
        // sin fiarse de su propio reloj; el backend vuelve a validar al reservar.
        long salidaMs, long limiteReservaMs, long ahoraServidorMs, int minutosAnticipacion) {
}
