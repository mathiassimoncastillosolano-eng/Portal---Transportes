package com.transportes.viajes.repositorios;

import java.math.BigDecimal;

/**
 * Resultado de la consulta agregada de {@link ViajeAsientoRepository#resumenPorViajes}.
 * Una fila por viaje, ya sumarizada en la propia base de datos (no se
 * traen las filas individuales de viaje_asiento al backend).
 */
public interface ResumenAsientosProjection {
    Integer getIdViaje();
    Long getDisponibles();
    BigDecimal getPrecioDesdeDisponible();
    BigDecimal getPrecioMinimo();
}
