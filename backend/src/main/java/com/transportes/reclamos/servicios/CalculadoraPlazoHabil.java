package com.transportes.reclamos.servicios;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

public final class CalculadoraPlazoHabil {

    public static final int DIAS_HABILES_RESPUESTA = 15;

    private CalculadoraPlazoHabil() {
    }

    public static boolean esDiaHabil(LocalDate fecha, Set<LocalDate> feriados) {
        DayOfWeek dia = fecha.getDayOfWeek();
        return dia != DayOfWeek.SATURDAY && dia != DayOfWeek.SUNDAY && !feriados.contains(fecha);
    }

    public static LocalDate fechaLimite(LocalDate registro, int diasHabiles, Set<LocalDate> feriados) {
        if (diasHabiles < 1) {
            throw new IllegalArgumentException("El plazo debe ser de al menos un día hábil");
        }
        LocalDate cursor = registro;
        int contados = 0;
        while (contados < diasHabiles) {
            cursor = cursor.plusDays(1);
            if (esDiaHabil(cursor, feriados)) {
                contados++;
            }
        }
        return cursor;
    }
}
