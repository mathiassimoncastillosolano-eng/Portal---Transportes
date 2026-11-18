package com.transportes.clientes.dto;

import java.util.List;

/** Página de resultados: contenido, total de filas, número y tamaño de página. */
public record PaginaClientesDto(List<ClienteResumenDto> contenido, long total, int pagina, int tamano) {
}
