package com.transportes.reclamos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.transportes.reclamos.servicios.CalculadoraPlazoHabil;

class CalculadoraPlazoHabilTest {

    private static final Set<LocalDate> SIN_FERIADOS = Set.of();

    @Test
    void quinceDiasHabilesDesdeUnLunesTerminanEnElLunesDeLaTerceraSemana() {
        LocalDate lunes = LocalDate.of(2026, 11, 9);
        assertEquals(LocalDate.of(2026, 11, 30), CalculadoraPlazoHabil.fechaLimite(lunes, 15, SIN_FERIADOS));
    }

    @Test
    void elDiaDeRegistroNoCuentaYUnSabadoEmpiezaElLunes() {
        LocalDate sabado = LocalDate.of(2026, 11, 14);
        assertEquals(LocalDate.of(2026, 12, 4), CalculadoraPlazoHabil.fechaLimite(sabado, 15, SIN_FERIADOS));
    }

    @Test
    void losFeriadosNoCuentanComoDiasHabiles() {
        LocalDate miercoles = LocalDate.of(2026, 11, 11);
        Set<LocalDate> feriados = Set.of(LocalDate.of(2026, 12, 8), LocalDate.of(2026, 12, 9));
        LocalDate sinFeriados = CalculadoraPlazoHabil.fechaLimite(miercoles, 15, SIN_FERIADOS);
        LocalDate conFeriados = CalculadoraPlazoHabil.fechaLimite(miercoles, 15, feriados);
        assertEquals(LocalDate.of(2026, 12, 2), sinFeriados);
        assertEquals(LocalDate.of(2026, 12, 2), conFeriados);
        LocalDate registro = LocalDate.of(2026, 11, 20);
        assertEquals(LocalDate.of(2026, 12, 11), CalculadoraPlazoHabil.fechaLimite(registro, 15, SIN_FERIADOS));
        assertEquals(LocalDate.of(2026, 12, 15), CalculadoraPlazoHabil.fechaLimite(registro, 15, feriados));
    }

    @Test
    void elResultadoSiempreEsUnDiaHabil() {
        Set<LocalDate> feriados = Set.of(LocalDate.of(2026, 12, 25));
        LocalDate limite = CalculadoraPlazoHabil.fechaLimite(LocalDate.of(2026, 12, 1), 15, feriados);
        assertTrue(CalculadoraPlazoHabil.esDiaHabil(limite, feriados));
        assertFalse(CalculadoraPlazoHabil.esDiaHabil(LocalDate.of(2026, 12, 25), feriados));
    }

    @Test
    void rechazaPlazosNoPositivos() {
        assertThrows(IllegalArgumentException.class,
                () -> CalculadoraPlazoHabil.fechaLimite(LocalDate.of(2026, 11, 9), 0, SIN_FERIADOS));
    }
}
