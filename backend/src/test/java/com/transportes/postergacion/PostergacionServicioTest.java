package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.servicios.PostergacionServicio;
import com.transportes.viajes.dto.ViajeResumenDto;
import com.transportes.viajes.reglas.PoliticaReservaViaje;
import com.transportes.viajes.servicios.ViajeService;

/**
 * HU-02 · Consulta de viajes (criterios 1, 2 y 3a), sin base de datos: el repositorio de compras y la
 * búsqueda de viajes se reemplazan por objetos simulados (Mockito).
 */
class PostergacionServicioTest {

    static final int USUARIO = 7;
    static final int PASAJE = 26;
    static final long VIAJE_ORIGINAL = 500L;
    static final LocalDate FECHA_NUEVA = LocalDate.of(2026, 11, 22);
    // "Ahora" para todas las pruebas: 20/11/2026 a las 09:00 (hora de Perú).
    static final LocalDateTime AHORA = LocalDateTime.of(2026, 11, 20, 9, 0);

    CompraRepositorio compras;
    ViajeService viajes;
    PostergacionServicio servicio;

    @BeforeEach
    void preparar() {
        compras = mock(CompraRepositorio.class);
        viajes = mock(ViajeService.class);
        Clock reloj = Clock.fixed(AHORA.atZone(PoliticaReservaViaje.ZONA_NEGOCIO).toInstant(),
                PoliticaReservaViaje.ZONA_NEGOCIO);
        servicio = new PostergacionServicio(compras, viajes, reloj);
    }

    // ---------- datos de prueba ----------

    /** Pasaje pagado del viaje original, con la salida y los estados indicados. */
    static FilaCompra pasaje(int idPasaje, LocalDateTime salida, String estadoVenta, String estadoViaje) {
        return new FilaCompra(10, estadoVenta, new BigDecimal("43.00"), AHORA.minusDays(1),
                "APROBADO", null, "PEN", null, null, null,
                idPasaje, new BigDecimal("43.00"), "DNI", "12345678", "ANA", "LOPEZ", "4B", (short) 1,
                VIAJE_ORIGINAL, salida.toLocalDate(), salida.toLocalTime(), estadoViaje,
                "Trujillo", "Cajamarca", "Bus Cama");
    }

    static FilaCompra pasajeVigente(LocalDateTime salida) {
        return pasaje(PASAJE, salida, "PAGADA", "PROGRAMADO");
    }

    /** Viaje de la búsqueda que sale a la hora indicada del 22/11 (o la fecha que se pase). */
    static ViajeResumenDto viaje(long id, LocalDateTime salida, int asientos, boolean reservable) {
        return new ViajeResumenDto(id, "RutaLibre", "Trujillo", "Lima", salida.toLocalDate(),
                salida.toLocalTime().toString(), "06:00", salida.toLocalDate().plusDays(1), "9 h", "Bus Cama",
                List.of(), asientos, new BigDecimal("60.00"), "PROGRAMADO",
                reservable ? "DISPONIBLE" : "NO_DISPONIBLE", reservable,
                PoliticaReservaViaje.aEpochMs(salida), 0L, 0L, 20);
    }

    ConsultaPostergacionDto consultar() {
        return servicio.consultarViajes(USUARIO, PASAJE, "Trujillo", "Lima", FECHA_NUEVA);
    }

    ResponseStatusException rechazo() {
        return assertThrows(ResponseStatusException.class, this::consultar);
    }

    // ---------- criterio 1: pasaje propio y vigente ----------

    @Test
    void unPasajeAjenoNoSeEncuentra() {
        // El usuario solo tiene el pasaje 25; el 26 es de otra cuenta.
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(
                pasaje(25, AHORA.plusDays(2), "PAGADA", "PROGRAMADO")));
        assertEquals(404, rechazo().getStatusCode().value());
        verify(viajes, never()).buscar(any(), any(), any(), any());
    }

    @Test
    void unPasajeSinPagarNoEstaVigente() {
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(
                pasaje(PASAJE, AHORA.plusDays(2), "PENDIENTE", "PROGRAMADO")));
        ResponseStatusException error = rechazo();
        assertEquals(409, error.getStatusCode().value());
        assertEquals("Este pasaje no está vigente, por eso no se puede cambiar.", error.getReason());
    }

    @Test
    void unPasajeDeUnViajeCanceladoNoEstaVigente() {
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(
                pasaje(PASAJE, AHORA.plusDays(2), "PAGADA", "CANCELADO")));
        assertEquals(409, rechazo().getStatusCode().value());
    }

    // ---------- criterio 2: 6 horas o más ----------

    @Test
    void con6HorasExactasSiSeConsulta() {
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(pasajeVigente(AHORA.plusHours(6))));
        when(viajes.buscar("Trujillo", "Lima", FECHA_NUEVA, "cualquiera")).thenReturn(List.of());
        assertEquals(0, consultar().viajes().size());
    }

    @Test
    void con5Horas59MinutosSeRechazaConElMotivo() {
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(
                pasajeVigente(AHORA.plusHours(5).plusMinutes(59))));
        ResponseStatusException error = rechazo();
        assertEquals(409, error.getStatusCode().value());
        assertEquals("Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.", error.getReason());
        verify(viajes, never()).buscar(any(), any(), any(), any());
    }

    @Test
    void unViajeQueYaSalioNoEstaVigente() {
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(pasajeVigente(AHORA.minusHours(1))));
        assertEquals(409, rechazo().getStatusCode().value());
    }

    // ---------- criterio 3a: solo viajes que se pueden elegir ----------

    @Test
    void soloOfreceViajesConAsientosReservablesYDistintosAlOriginal() {
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(pasajeVigente(AHORA.plusDays(1))));
        LocalDateTime salida = FECHA_NUEVA.atTime(LocalTime.of(21, 0));
        when(viajes.buscar("Trujillo", "Lima", FECHA_NUEVA, "cualquiera")).thenReturn(List.of(
                viaje(1, salida, 10, true),                          // se ofrece
                viaje(2, salida, 0, true),                           // lleno
                viaje(3, salida, 5, false),                          // el servidor no permite reservarlo
                viaje(VIAJE_ORIGINAL, salida, 8, true),              // es el mismo viaje del pasaje
                viaje(4, AHORA.plusHours(2), 9, true)));             // sale en 2 h: se ofrece (adelantar)

        ConsultaPostergacionDto resultado = consultar();

        // La regla de 6 h es solo para el viaje original: el viaje 4 sale pronto y aun así se ofrece.
        assertEquals(List.of(1L, 4L), resultado.viajes().stream().map(ViajeResumenDto::id).toList());
        assertEquals(3, resultado.ocultos());
    }
}
