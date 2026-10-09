package com.transportes.viajes.dto;

import java.time.LocalDate;

/**
 * Resultado de buscar un DNI. {@code origen}: BD (pasajero registrado; nombres y apellidos no editables),
 * APIPERU (datos de identidad autocompletados) o MANUAL (sin datos: el usuario los escribe).
 * Consultar nunca crea ni modifica pasajeros.
 */
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
