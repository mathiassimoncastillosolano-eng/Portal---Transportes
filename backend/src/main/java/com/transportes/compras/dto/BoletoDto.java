package com.transportes.compras.dto;

import java.math.BigDecimal;

/** Datos de un boleto (un pasaje) que se muestran en "Mis pasajes". */
public record BoletoDto(
        Integer idPasaje, String numeroBoleto, String pasajero, String documento,
        String asiento, Short piso, BigDecimal precio, BigDecimal adicionalPagado,
        ViajeBoletoDto viajeVigente, CambioBoletoDto cambio) {
}
