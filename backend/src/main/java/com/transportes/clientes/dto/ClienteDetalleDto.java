package com.transportes.clientes.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Respuesta de GET /api/clientes/{id}: datos del pasajero y su historial de viajes. */
public record ClienteDetalleDto(
        int idPasajero, String tipoDocumento, String numeroDocumento, String nombres, String apellidos,
        String telefono, LocalDate fechaNacimiento, LocalDateTime fechaRegistro, int viajes,
        LocalDateTime primerViaje, LocalDateTime ultimoViaje, LocalDateTime proximoViaje,
        List<ViajeHistorialDto> historial) {
}
