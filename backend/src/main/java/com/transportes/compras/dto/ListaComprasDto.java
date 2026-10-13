package com.transportes.compras.dto;

import java.util.List;

/** Respuesta de los listados: las compras y cuántas de ellas están vigentes (calculado en el servidor). */
public record ListaComprasDto(int comprasVigentes, List<CompraDto> compras) {
}
