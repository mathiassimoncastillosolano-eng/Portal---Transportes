package com.transportes.pasajes.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PasajeDto(
        int idPasaje, String numeroBoleto, int idVenta, String codigoCompra, String comprobante,
        int idPasajero, String pasajero, String documento,
        String origen, String destino, LocalDate fechaSalida, String horaSalida,
        String horaLlegada, LocalDate fechaLlegada, String asiento, Short piso, String bus,
        BigDecimal precio, String moneda, String estadoPasaje, String fase, boolean documentoDisponible,
        boolean cambiado) {
}
