package com.transportes.clientes.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Un viaje dentro del historial de un pasajero. */
public record ViajeHistorialDto(
        int idPasaje, String numeroBoleto, int idVenta, String codigoCompra, String comprobante,
        String origen, String destino, LocalDate fechaSalida, String horaSalida,
        String horaLlegada, LocalDate fechaLlegada, String asiento, Short piso, String bus,
        BigDecimal precio, String moneda, String estadoPasaje, String fase, boolean documentoDisponible,
        String pasajero, String documento) {
}
