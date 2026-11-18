package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Último cambio de viaje de un boleto. Solo existe si el boleto fue cambiado.
 * @param anterior viaje y asiento que tenía justo antes de este cambio
 * @param adicionalPagado suma de lo pagado en TODOS sus cambios, no solo el último
 * @param fecha fecha y hora del último cambio (hora de Perú)
 */
public record CambioBoletoDto(ViajeBoletoDto anterior, BigDecimal adicionalPagado, LocalDateTime fecha) {
}
