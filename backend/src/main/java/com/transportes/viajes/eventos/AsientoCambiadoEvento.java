package com.transportes.viajes.eventos;

/**
 * Evento "un asiento cambió de estado". AsientoSseServicio lo envía a los navegadores cuando la transacción
 * se confirma.
 */
public record AsientoCambiadoEvento(Long idViaje, Integer idAsiento, String estado) {
}