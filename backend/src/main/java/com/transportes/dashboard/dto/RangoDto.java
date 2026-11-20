package com.transportes.dashboard.dto;

import java.time.LocalDate;

/** Rango de fechas inclusivo (desde y hasta cuentan). */
public record RangoDto(LocalDate desde, LocalDate hasta) {
}
