package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Datos del último cambio de viaje de un boleto. */
public record CambioBoletoDto(ViajeBoletoDto anterior, BigDecimal adicionalPagado, LocalDateTime fecha) {
}
