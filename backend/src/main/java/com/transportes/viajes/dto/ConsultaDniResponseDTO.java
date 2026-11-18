package com.transportes.viajes.dto;

import java.time.LocalDate;

/**
 * Resultado de buscar un DNI. origen dice de dónde salieron los datos: BD (pasajero ya registrado; nombres no
 * editables), APIPERU (autocompletado) o MANUAL (no se encontró; el usuario los escribe). Consultar nunca crea ni
 * cambia pasajeros.
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
