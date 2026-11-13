package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.junit.jupiter.api.Test;

import com.transportes.postergacion.reglas.PoliticaPostergacion;
import com.transportes.postergacion.reglas.PoliticaPostergacion.Resultado;

/** HU-02 criterio 2: regla de las 6 horas, con horas fijas. */
class PoliticaPostergacionTest {

    // El viaje original sale el 20/11/2026 a las 21:00 (hora de Perú).
    static final LocalDate FECHA = LocalDate.of(2026, 11, 20);
    static final LocalTime HORA = LocalTime.of(21, 0);

    Resultado evaluarA(int hora, int minuto) {
        return PoliticaPostergacion.evaluar(FECHA, HORA, LocalDateTime.of(2026, 11, 20, hora, minuto));
    }

    @Test
    void faltandoMasDe6HorasSeAcepta() {
        assertEquals(Resultado.ACEPTADO, evaluarA(9, 0));
    }

    @Test
    void faltando6HorasExactasSeAcepta() {
        assertEquals(Resultado.ACEPTADO, evaluarA(15, 0));
    }

    @Test
    void faltando5Horas59MinutosSeRechaza() {
        assertEquals(Resultado.ANTICIPACION_INSUFICIENTE, evaluarA(15, 1));
    }

    @Test
    void siElViajeYaSalioSeRechaza() {
        assertEquals(Resultado.VIAJE_YA_SALIO, evaluarA(21, 0));
        assertEquals(Resultado.VIAJE_YA_SALIO, evaluarA(23, 30));
    }

    @Test
    void cuentaBienLasHorasAlCruzarLaMedianoche() {
        // Salida 21/11 a las 02:00; a las 20:00 del día anterior faltan 6 h exactas.
        LocalDate fecha = LocalDate.of(2026, 11, 21);
        LocalTime hora = LocalTime.of(2, 0);
        assertEquals(Resultado.ACEPTADO,
                PoliticaPostergacion.evaluar(fecha, hora, LocalDateTime.of(2026, 11, 20, 20, 0)));
        assertEquals(Resultado.ANTICIPACION_INSUFICIENTE,
                PoliticaPostergacion.evaluar(fecha, hora, LocalDateTime.of(2026, 11, 20, 20, 30)));
    }

    @Test
    void cadaRechazoTraeSuMotivo() {
        assertEquals("", Resultado.ACEPTADO.mensaje());
        assertEquals("El viaje ya salió. Ya no se puede cambiar este pasaje.", Resultado.VIAJE_YA_SALIO.mensaje());
        assertEquals("Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.",
                Resultado.ANTICIPACION_INSUFICIENTE.mensaje());
    }
}
