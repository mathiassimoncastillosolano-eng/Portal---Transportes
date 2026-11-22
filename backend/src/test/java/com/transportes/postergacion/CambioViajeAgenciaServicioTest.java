package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.dto.ElegibilidadCambioDto;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.servicios.CambioViajeAgenciaServicio;
import com.transportes.postergacion.servicios.PostergacionServicio;
import com.transportes.viajes.reglas.PoliticaReservaViaje;
import com.transportes.viajes.servicios.ViajeService;

/**
 * Cambio de viajes desde el Sistema Empresarial, sin base de datos (Mockito).
 * Reutiliza los datos de prueba de PostergacionServicioTest: "ahora" es el 20/11/2026 a las 09:00.
 */
class CambioViajeAgenciaServicioTest {

    static final int PASAJE = PostergacionServicioTest.PASAJE;
    static final LocalDateTime AHORA = PostergacionServicioTest.AHORA;
    static final LocalDate FECHA_NUEVA = PostergacionServicioTest.FECHA_NUEVA;

    CompraRepositorio compras;
    ViajeService viajes;
    CambioViajeAgenciaServicio servicio;

    @BeforeEach
    void preparar() {
        compras = mock(CompraRepositorio.class);
        viajes = mock(ViajeService.class);
        Clock reloj = Clock.fixed(AHORA.atZone(PoliticaReservaViaje.ZONA_NEGOCIO).toInstant(),
                PoliticaReservaViaje.ZONA_NEGOCIO);
        servicio = new CambioViajeAgenciaServicio(compras, new PostergacionServicio(compras, viajes, reloj));
    }

    // ---------- elegibilidad ----------

    @Test
    void unPasajeVigenteConMasDe6HorasEsElegible() {
        when(compras.filaDelPasaje(PASAJE)).thenReturn(Optional.of(
                PostergacionServicioTest.pasajeVigente(AHORA.plusDays(2))));
        ElegibilidadCambioDto respuesta = servicio.consultarElegibilidad(PASAJE);
        assertTrue(respuesta.elegible());
        assertNull(respuesta.codigo());
    }

    @Test
    void con6HorasExactasTodaviaEsElegible() {
        when(compras.filaDelPasaje(PASAJE)).thenReturn(Optional.of(
                PostergacionServicioTest.pasajeVigente(AHORA.plusHours(6))));
        assertTrue(servicio.consultarElegibilidad(PASAJE).elegible());
    }

    @Test
    void conMenosDe6HorasNoEsElegibleYDiceElMotivo() {
        when(compras.filaDelPasaje(PASAJE)).thenReturn(Optional.of(
                PostergacionServicioTest.pasajeVigente(AHORA.plusHours(5).plusMinutes(59))));
        ElegibilidadCambioDto respuesta = servicio.consultarElegibilidad(PASAJE);
        assertFalse(respuesta.elegible());
        assertEquals(PostergacionRechazadaException.ANTICIPACION_INSUFICIENTE, respuesta.codigo());
    }

    @Test
    void unPasajeSinPagarNoEsElegible() {
        when(compras.filaDelPasaje(PASAJE)).thenReturn(Optional.of(
                PostergacionServicioTest.pasaje(PASAJE, AHORA.plusDays(2), "PENDIENTE", "PROGRAMADO")));
        ElegibilidadCambioDto respuesta = servicio.consultarElegibilidad(PASAJE);
        assertFalse(respuesta.elegible());
        assertEquals(PostergacionRechazadaException.PASAJE_NO_VIGENTE, respuesta.codigo());
    }

    @Test
    void unPasajeQueNoExisteResponde404() {
        when(compras.filaDelPasaje(PASAJE)).thenReturn(Optional.empty());
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> servicio.consultarElegibilidad(PASAJE));
        assertEquals(404, error.getStatusCode().value());
    }

    // ---------- viajes disponibles ----------

    @Test
    void listaLosViajesSinElViajeOriginal() {
        when(compras.filaDelPasaje(PASAJE)).thenReturn(Optional.of(
                PostergacionServicioTest.pasajeVigente(AHORA.plusDays(2))));
        LocalDateTime salida = FECHA_NUEVA.atTime(10, 0);
        when(viajes.buscar("Trujillo", "Lima", FECHA_NUEVA, "cualquiera")).thenReturn(List.of(
                PostergacionServicioTest.viaje(PostergacionServicioTest.VIAJE_ORIGINAL, salida, 20, true),
                PostergacionServicioTest.viaje(600L, salida, 20, true)));

        ConsultaPostergacionDto respuesta = servicio.consultarViajes(PASAJE, "Trujillo", "Lima", FECHA_NUEVA);

        assertEquals(1, respuesta.viajes().size());
        assertEquals(600L, respuesta.viajes().get(0).id());
        assertEquals(1, respuesta.ocultos());
    }

    @Test
    void conMenosDe6HorasNoBuscaViajes() {
        when(compras.filaDelPasaje(PASAJE)).thenReturn(Optional.of(
                PostergacionServicioTest.pasajeVigente(AHORA.plusHours(2))));
        PostergacionRechazadaException error = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.consultarViajes(PASAJE, "Trujillo", "Lima", FECHA_NUEVA));
        assertEquals(PostergacionRechazadaException.ANTICIPACION_INSUFICIENTE, error.getCodigo());
        verify(viajes, never()).buscar(any(), any(), any(), any());
    }
}
