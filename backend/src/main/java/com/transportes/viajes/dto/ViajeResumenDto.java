package com.transportes.viajes.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ViajeResumenDto(
        Long id, String empresa, String origen, String destino,
        LocalDate fechaSalida, String horaSalida, String horaLlegada,
        LocalDate fechaLlegada, String duracion, String tipoBus,
        List<String> servicios, int asientosDisponibles, BigDecimal precio, String estado) {
}
