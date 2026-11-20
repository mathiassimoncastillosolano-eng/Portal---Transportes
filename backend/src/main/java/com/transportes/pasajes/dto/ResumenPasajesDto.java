package com.transportes.pasajes.dto;

import java.math.BigDecimal;

public record ResumenPasajesDto(long confirmados, long proximos, BigDecimal ingresos) {
}
