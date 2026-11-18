package com.transportes.clientes.dto;

import java.util.List;

/** Una página de la tabla de clientes: las filas, el total de resultados, el número de página y su tamaño. */
public record PaginaClientesDto(List<ClienteResumenDto> contenido, long total, int pagina, int tamano) {
}
