package com.transportes.pasajes.dto;

import java.util.List;

public record PaginaPasajesDto(List<PasajeDto> contenido, long total, int pagina, int tamano,
        ResumenPasajesDto resumen) {
}
