package com.transportes.viajes.dto;

import java.time.LocalDate;

public record PasajeroAsientoRequest(
        Integer idAsiento,
        String tipoDocumento,
        String numeroDocumento,
        String nombres,
        String apellidos,
        LocalDate fechaNacimiento,
        String nroTelefono
) {
}