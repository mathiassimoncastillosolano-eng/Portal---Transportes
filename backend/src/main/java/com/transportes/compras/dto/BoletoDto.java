package com.transportes.compras.dto;

import java.math.BigDecimal;

/**
 * Un boleto = un registro de pasaje (un asiento). numeroBoleto se forma con el id del pasaje; es solo una
 * referencia, no un código QR.
 * precio: lo que costó al comprarlo; no cambia al postergar.
 * adicionalPagado: suma de lo pagado en todos sus cambios de viaje (0 si no hubo).
 * precio + adicionalPagado = total pagado por el boleto (base para cobrar la siguiente diferencia).
 * viajeVigente: el viaje en que viaja hoy (el nuevo si se cambió).
 * cambio: datos del último cambio, o null si nunca se cambió.
 */
public record BoletoDto(
        Integer idPasaje, String numeroBoleto, String pasajero, String documento,
        String asiento, Short piso, BigDecimal precio, BigDecimal adicionalPagado,
        ViajeBoletoDto viajeVigente, CambioBoletoDto cambio) {
}
