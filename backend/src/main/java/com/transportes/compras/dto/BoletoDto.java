package com.transportes.compras.dto;

import java.math.BigDecimal;

/**
 * Un boleto = un registro de {@code pasaje}. {@code numeroBoleto} se deriva del id del pasaje (clave primaria:
 * persistente y único). Es una referencia de lectura, no un código de validación ni un QR.
 */
public record BoletoDto(
        Integer idPasaje, String numeroBoleto, String pasajero, String documento,
        String asiento, Short piso, BigDecimal precio) {
}
