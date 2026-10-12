package com.transportes.viajes;

import static com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva.DISPONIBLE;
import static com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva.LLENO;
import static com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva.NO_DISPONIBLE;
import static com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva.RESERVA_CERRADA;
import static com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva.SALIDA_REALIZADA;
import static com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva.SIN_INFORMACION;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.junit.jupiter.api.Test;

import com.transportes.viajes.reglas.PoliticaReservaViaje;
import com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva;

/** Regla de anticipación de 20 minutos con relojes fijos (la clase es pura: no necesita Spring ni BD). */
class PoliticaReservaViajeTest {

    private static final LocalDate DIA = LocalDate.of(2026, 10, 17);
    private static final LocalTime OCHO = LocalTime.of(8, 0);

    private static LocalDateTime a(int hora, int minuto) {
        return LocalDateTime.of(DIA, LocalTime.of(hora, minuto));
    }

    private static EstadoReserva evaluar(LocalDateTime ahora) {
        return PoliticaReservaViaje.evaluar("PROGRAMADO", DIA, OCHO, 40, 10, ahora);
    }

    @Test
    void salidaA0800_ahora0739_esReservable_porqueFaltan21Minutos() {
        // 07:39 es ANTERIOR al límite (07:40): faltan 21 minutos, así que se puede reservar.
        assertEquals(DISPONIBLE, evaluar(a(7, 39)));
        assertEquals(DISPONIBLE, evaluar(a(6, 0)));
    }

    @Test
    void limiteEs0740_inclusivo() {
        assertEquals(LocalDateTime.of(DIA, LocalTime.of(7, 40)), PoliticaReservaViaje.limiteReserva(DIA, OCHO));
        assertEquals(DISPONIBLE, evaluar(a(7, 40)));
        assertEquals(DISPONIBLE, evaluar(LocalDateTime.of(DIA, LocalTime.of(7, 40, 0))));
    }

    @Test
    void despuesDelLimiteYAntesDeLaSalida_reservaCerrada() {
        assertEquals(RESERVA_CERRADA, evaluar(a(7, 41)));
        assertEquals(RESERVA_CERRADA, evaluar(a(7, 59)));
        assertEquals(RESERVA_CERRADA, evaluar(LocalDateTime.of(DIA, LocalTime.of(7, 40, 1))));
    }

    @Test
    void enPuntoOLuegoDeLaSalida_salidaRealizada() {
        assertEquals(SALIDA_REALIZADA, evaluar(a(8, 0)));
        assertEquals(SALIDA_REALIZADA, evaluar(a(8, 1)));
        assertEquals(SALIDA_REALIZADA, evaluar(a(23, 59)));
    }

    @Test
    void viajeDelDiaAnterior_noEsReservable() {
        LocalDateTime ayer = LocalDateTime.of(DIA.minusDays(1), LocalTime.of(23, 0));
        assertEquals(SALIDA_REALIZADA, PoliticaReservaViaje.evaluar("PROGRAMADO", DIA.minusDays(2), LocalTime.of(23, 50), 40, 10, ayer));
        // La hora del día sola no basta: 06:00 de HOY es anterior a las 08:00 de ayer? No: ayer ya pasó por completo.
        assertEquals(SALIDA_REALIZADA, PoliticaReservaViaje.evaluar("PROGRAMADO", DIA.minusDays(1), OCHO, 40, 10, a(6, 0)));
    }

    @Test
    void salidaPasadaMedianoche_comparaFechaCompleta() {
        // Salida 00:10 del 18: el límite es 23:50 del 17 (día anterior a la salida).
        LocalDate dia18 = DIA.plusDays(1);
        LocalTime cero10 = LocalTime.of(0, 10);
        assertEquals(LocalDateTime.of(DIA, LocalTime.of(23, 50)), PoliticaReservaViaje.limiteReserva(dia18, cero10));
        assertEquals(DISPONIBLE, PoliticaReservaViaje.evaluar("PROGRAMADO", dia18, cero10, 40, 10, a(23, 50)));
        assertEquals(RESERVA_CERRADA, PoliticaReservaViaje.evaluar("PROGRAMADO", dia18, cero10, 40, 10, a(23, 51)));
        assertEquals(SALIDA_REALIZADA, PoliticaReservaViaje.evaluar("PROGRAMADO", dia18, cero10,
                40, 10, LocalDateTime.of(dia18, LocalTime.of(0, 10))));
        // Dos días antes a las 23:55 todavía sobra tiempo aunque la "hora del día" sea posterior a 00:10.
        assertEquals(DISPONIBLE, PoliticaReservaViaje.evaluar("PROGRAMADO", dia18, cero10, 40, 10, a(12, 0)));
    }

    @Test
    void ejemplosDeLaTablaDeHorarios() {
        Object[][] casos = {{8, 0, 7, 40}, {8, 30, 8, 10}, {12, 0, 11, 40}, {17, 15, 16, 55}};
        for (Object[] c : casos) {
            LocalTime salida = LocalTime.of((int) c[0], (int) c[1]);
            LocalTime limite = LocalTime.of((int) c[2], (int) c[3]);
            assertEquals(DIA.atTime(limite), PoliticaReservaViaje.limiteReserva(DIA, salida));
            assertTrue(PoliticaReservaViaje.cumpleAnticipacion(DIA, salida, DIA.atTime(limite)));
            assertFalse(PoliticaReservaViaje.cumpleAnticipacion(DIA, salida, DIA.atTime(limite).plusMinutes(1)));
        }
    }

    @Test
    void viajeLlenoSeMuestraPeroNoSeReserva() {
        EstadoReserva estado = PoliticaReservaViaje.evaluar("PROGRAMADO", DIA, OCHO, 40, 0, a(6, 0));
        assertEquals(LLENO, estado);
        assertFalse(estado.reservable());
    }

    @Test
    void sinAsientosRegistradosNoSeDeclaraLleno() {
        EstadoReserva estado = PoliticaReservaViaje.evaluar("PROGRAMADO", DIA, OCHO, 0, 0, a(6, 0));
        assertEquals(SIN_INFORMACION, estado);
        assertFalse(estado.reservable());
    }

    @Test
    void prioridad_salioGanaAlLleno_yLlenoGanaAReservaCerrada() {
        assertEquals(SALIDA_REALIZADA, PoliticaReservaViaje.evaluar("PROGRAMADO", DIA, OCHO, 40, 0, a(9, 0)));
        assertEquals(LLENO, PoliticaReservaViaje.evaluar("PROGRAMADO", DIA, OCHO, 40, 0, a(7, 50)));
    }

    @Test
    void estadoAdministrativoNoReservableSeConserva() {
        assertEquals(NO_DISPONIBLE, PoliticaReservaViaje.evaluar("CANCELADO", DIA, OCHO, 40, 10, a(6, 0)));
        assertEquals(NO_DISPONIBLE, PoliticaReservaViaje.evaluar("CANCELADO", DIA, OCHO, 40, 10, a(9, 0)));
        assertFalse(NO_DISPONIBLE.reservable());
    }

    @Test
    void soloDisponibleEsReservable() {
        for (EstadoReserva e : EstadoReserva.values()) {
            assertEquals(e == DISPONIBLE, e.reservable());
        }
    }

    @Test
    void epochMsUsaLaZonaDeLima() {
        // 2026-10-17 08:00 en Lima (UTC-5, sin horario de verano) = 13:00 UTC.
        long esperado = java.time.ZonedDateTime.of(2026, 10, 17, 13, 0, 0, 0, java.time.ZoneOffset.UTC).toInstant().toEpochMilli();
        assertEquals(esperado, PoliticaReservaViaje.aEpochMs(LocalDateTime.of(DIA, OCHO)));
    }
}
