package com.transportes.salud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.transportes.salud.servicios.DisponibilidadServicio;
import com.transportes.salud.servicios.VerificadorBaseDatos;
import org.junit.jupiter.api.Test;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.HttpStatus;

class DisponibilidadServicioTest {

    final ApplicationAvailability disponibilidad = mock(ApplicationAvailability.class);
    final VerificadorBaseDatos bd = mock(VerificadorBaseDatos.class);

    DisponibilidadServicio servicio(boolean tolerar) {
        return new DisponibilidadServicio(disponibilidad, bd, tolerar);
    }

    @Test
    void springTodaviaArrancandoResponde503SinTocarLaBase() {
        when(disponibilidad.getReadinessState()).thenReturn(ReadinessState.REFUSING_TRAFFIC);

        var resultado = servicio(true).evaluar();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resultado.codigo());
        assertEquals("NOT_READY", resultado.cuerpo().status());
        assertEquals("INICIANDO", resultado.cuerpo().fase());
        verify(bd, never()).disponible();
    }

    @Test
    void listoYConBaseResponde200Ready() {
        when(disponibilidad.getReadinessState()).thenReturn(ReadinessState.ACCEPTING_TRAFFIC);
        when(bd.disponible()).thenReturn(true);

        var resultado = servicio(true).evaluar();

        assertEquals(HttpStatus.OK, resultado.codigo());
        assertEquals("READY", resultado.cuerpo().status());
        assertNull(resultado.cuerpo().fase());
    }

    @Test
    void baseCaidaAntesDeLaPrimeraConfirmacionResponde503() {
        when(disponibilidad.getReadinessState()).thenReturn(ReadinessState.ACCEPTING_TRAFFIC);
        when(bd.disponible()).thenReturn(false);

        var resultado = servicio(true).evaluar();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resultado.codigo());
        assertEquals("NOT_READY", resultado.cuerpo().status());
        assertEquals("DEPENDENCIAS", resultado.cuerpo().fase());
    }

    @Test
    void caidaTransitoriaTrasEstarListoNoProvocaReinicioEnRender() {
        when(disponibilidad.getReadinessState()).thenReturn(ReadinessState.ACCEPTING_TRAFFIC);
        when(bd.disponible()).thenReturn(true, false, true);
        var servicio = servicio(true);

        assertEquals("READY", servicio.evaluar().cuerpo().status());

        var degradado = servicio.evaluar();
        assertEquals(HttpStatus.OK, degradado.codigo());
        assertEquals("DEGRADED", degradado.cuerpo().status());
        assertEquals("DEPENDENCIAS", degradado.cuerpo().fase());

        assertEquals("READY", servicio.evaluar().cuerpo().status());
    }

    @Test
    void sinToleranciaUnaCaidaTrasEstarListoResponde503() {
        when(disponibilidad.getReadinessState()).thenReturn(ReadinessState.ACCEPTING_TRAFFIC);
        when(bd.disponible()).thenReturn(true, false);
        var servicio = servicio(false);

        servicio.evaluar();
        var resultado = servicio.evaluar();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resultado.codigo());
        assertEquals("NOT_READY", resultado.cuerpo().status());
    }

    @Test
    void apagadoOrdenadoResponde503Deteniendo() {
        when(disponibilidad.getReadinessState()).thenReturn(ReadinessState.ACCEPTING_TRAFFIC,
                ReadinessState.REFUSING_TRAFFIC);
        when(bd.disponible()).thenReturn(true);
        var servicio = servicio(true);

        servicio.evaluar();
        var resultado = servicio.evaluar();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, resultado.codigo());
        assertEquals("DETENIENDO", resultado.cuerpo().fase());
    }
}
