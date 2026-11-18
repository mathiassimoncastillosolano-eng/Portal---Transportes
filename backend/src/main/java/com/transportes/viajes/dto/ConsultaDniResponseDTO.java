package com.transportes.viajes.dto;

import java.time.LocalDate;

/** Datos encontrados al buscar un DNI y de dónde salieron. */
public record ConsultaDniResponseDTO(
        String dni,
        boolean existente,
        String origen,
        String nombres,
        String apellidos,
        LocalDate fechaNacimiento,
        String nroTelefono
) {
}
