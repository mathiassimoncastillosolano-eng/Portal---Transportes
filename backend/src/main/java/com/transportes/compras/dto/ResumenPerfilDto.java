package com.transportes.compras.dto;

/**
 * Indicadores del perfil. Todos se calculan sobre compras CONFIRMADAS del usuario autenticado:
 * <ul>
 *   <li>{@code pasajes}: registros de pasaje (uno por asiento), sin contar ventas ni multiplicar por joins.</li>
 *   <li>{@code viajesCompletados}: viajes distintos PROGRAMADOS cuya salida ya pasó.</li>
 *   <li>{@code tickets}: pasajes cuyo documento puede descargarse (viaje no cancelado). El sistema no guarda
 *       tickets ni QR; el documento se genera a partir del pasaje.</li>
 *   <li>{@code comprasVigentes}: compras confirmadas con viaje próximo.</li>
 * </ul>
 */
public record ResumenPerfilDto(int pasajes, int viajesCompletados, int tickets, int comprasVigentes) {
}
