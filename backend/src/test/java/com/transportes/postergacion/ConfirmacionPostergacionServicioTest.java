package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.pagos.entidades.OperacionPago;
import com.transportes.pagos.entidades.Pasaje;
import com.transportes.pagos.repositorios.PasajeRepositorio;
import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.dto.ConfirmarPostergacionRequest;
import com.transportes.postergacion.entidades.Postergacion;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.repositorios.PostergacionRepositorio;
import com.transportes.postergacion.servicios.ConfirmacionPostergacionServicio;
import com.transportes.postergacion.servicios.PostergacionServicio;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.excepciones.ReservaNoPermitidaException;
import com.transportes.viajes.excepciones.SesionExpiradaException;
import com.transportes.viajes.reglas.PoliticaReservaViaje;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.TokenSesionServicio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;
import com.transportes.viajes.servicios.ValidadorReservaViaje;

/**
 * HU-02 · Confirmación (criterios 8 a 11), sin base de datos: los repositorios y servicios vecinos son objetos
 * simulados (Mockito). Verifican el ORDEN de los pasos y que un rechazo no toque nada. La reversión de la
 * transacción completa la prueba PostergacionConfirmacionIntegracionTest con la base real.
 */
class ConfirmacionPostergacionServicioTest {

    static final int USUARIO = 7;
    static final int PASAJE = 26;
    static final int VENTA = 10;
    static final int PASAJERO = 3;
    static final long VIAJE_ORIGINAL = 500L;
    static final long VIAJE_NUEVO = 600L;
    static final int VA_ORIGINAL = 1001;   // id_viaje_asiento del asiento actual del pasaje
    static final int VA_NUEVO = 2002;      // id_viaje_asiento del asiento elegido
    static final int ASIENTO_NUEVO = 22;   // id_asiento (físico) del asiento elegido
    static final String SESION = "sesion-1";
    static final LocalDateTime AHORA = LocalDateTime.of(2026, 11, 20, 9, 0);

    PostergacionServicio postergaciones;
    PasajeRepositorio pasajes;
    ViajeAsientoRepositorio asientos;
    PostergacionRepositorio historial;
    CompraRepositorio compras;
    TokenSesionServicio tokens;
    ValidadorReservaViaje validadorReserva;
    ApplicationEventPublisher publicador;
    ConfirmacionPostergacionServicio servicio;

    @BeforeEach
    void preparar() {
        postergaciones = mock(PostergacionServicio.class);
        pasajes = mock(PasajeRepositorio.class);
        asientos = mock(ViajeAsientoRepositorio.class);
        historial = mock(PostergacionRepositorio.class);
        compras = mock(CompraRepositorio.class);
        tokens = mock(TokenSesionServicio.class);
        validadorReserva = mock(ValidadorReservaViaje.class);
        publicador = mock(ApplicationEventPublisher.class);
        Clock reloj = Clock.fixed(AHORA.atZone(PoliticaReservaViaje.ZONA_NEGOCIO).toInstant(),
                PoliticaReservaViaje.ZONA_NEGOCIO);
        servicio = new ConfirmacionPostergacionServicio(postergaciones, pasajes, asientos, historial, compras,
                tokens, validadorReserva, publicador, reloj);

        // Situación feliz por defecto: todo es válido y cada UPDATE cambia exactamente una fila.
        when(postergaciones.exigirPasajeCambiable(USUARIO, PASAJE)).thenReturn(fila("12A", VIAJE_ORIGINAL,
                LocalDate.of(2026, 11, 22), "Trujillo", "Lima"));
        when(tokens.validar(anyString(), eq(VIAJE_NUEVO))).thenReturn(
                new SesionReserva("token", SESION, VIAJE_NUEVO, AHORA.plusMinutes(10)));
        when(pasajes.findById(PASAJE)).thenReturn(Optional.of(pasaje()));
        when(asientos.findById(VA_ORIGINAL)).thenReturn(Optional.of(asiento(VA_ORIGINAL, 500, 11, "43.00", "OCUPADO")));
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "43.00", "BLOQUEADO_TEMPORAL")));
        when(asientos.ocuparAsientoDeSesion(VA_NUEVO, SESION, PASAJERO)).thenReturn(1);
        when(historial.moverPasajeAlAsiento(PASAJE, VA_ORIGINAL, VA_NUEVO)).thenReturn(1);
        when(historial.liberarAsientoOcupado(VA_ORIGINAL)).thenReturn(1);
        when(historial.save(any(Postergacion.class))).thenAnswer(inv -> {
            Postergacion p = inv.getArgument(0);
            p.setIdPostergacion(77);
            return p;
        });
        // Lo que queda guardado después del cambio (criterio 11 lo lee de aquí).
        when(compras.filasDelUsuario(USUARIO)).thenReturn(List.of(fila("20B", VIAJE_NUEVO,
                LocalDate.of(2026, 11, 25), "Trujillo", "Lima")));
    }

    // ---------- criterio 8, 10 y 11: se aplica todo, en orden ----------

    @Test
    void aplicaElCambioEnOrdenYDevuelveLoQueQuedoGuardado() {
        ConfirmacionPostergacionDto r = servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null));

        InOrder orden = inOrder(asientos, historial, publicador);
        orden.verify(asientos).bloquearSesion("postergacion:" + PASAJE);
        orden.verify(asientos).ocuparAsientoDeSesion(VA_NUEVO, SESION, PASAJERO);
        orden.verify(historial).moverPasajeAlAsiento(PASAJE, VA_ORIGINAL, VA_NUEVO);
        orden.verify(historial).liberarAsientoOcupado(VA_ORIGINAL);
        orden.verify(historial).save(any(Postergacion.class));

        assertTrue(r.aceptada());
        assertEquals(77, r.idPostergacion());
        assertEquals(PASAJE, r.idPasaje());
        assertEquals(VENTA, r.idVenta(), "misma venta");
        assertEquals(VIAJE_ORIGINAL, r.idViajeAnterior());
        assertEquals("12A", r.asientoAnterior());
        assertEquals(VIAJE_NUEVO, r.idViajeNuevo());
        assertEquals(LocalDate.of(2026, 11, 25), r.fechaSalida());
        assertEquals(LocalTime.of(8, 0), r.horaSalida());
        assertEquals("20B", r.asientoNuevo());
    }

    @Test
    void guardaViajeAnteriorNuevoAsientosEImporteEnElHistorial() {
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "60.00", "BLOQUEADO_TEMPORAL")));

        ConfirmacionPostergacionDto r = servicio.aplicarCambioPagado(operacion("17.00", "SIM-ABC123"));

        ArgumentCaptor<Postergacion> captor = ArgumentCaptor.forClass(Postergacion.class);
        verify(historial).save(captor.capture());
        Postergacion guardada = captor.getValue();
        assertEquals(PASAJE, guardada.getIdPasaje());
        assertEquals(VENTA, guardada.getIdVenta());
        assertEquals(500L, guardada.getIdViajeAnterior());
        assertEquals(600L, guardada.getIdViajeNuevo());
        assertEquals(VA_ORIGINAL, guardada.getIdViajeAsientoAnterior());
        assertEquals(VA_NUEVO, guardada.getIdViajeAsientoNuevo());
        assertEquals(0, new BigDecimal("17.00").compareTo(guardada.getImporteAdicional()));
        assertEquals("SIM-ABC123", guardada.getReferenciaPago());
        assertEquals(0, new BigDecimal("17.00").compareTo(r.importeAdicional()));
    }

    // ---------- criterio 9: rechazo y conservación ----------

    @Test
    void siElAsientoNuevoYaNoEstaDisponibleSeRechazaSinTocarNada() {
        when(asientos.ocuparAsientoDeSesion(VA_NUEVO, SESION, PASAJERO)).thenReturn(0);

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(PostergacionRechazadaException.ASIENTO_NO_DISPONIBLE, e.getCodigo());
        assertEquals(409, e.getStatusCode().value());
        assertTrue(e.getReason().contains("Tu pasaje original no fue modificado"));
        sinCambios();
    }

    @Test
    void siElAsientoNuevoNoExisteEnElViajeSeRechaza() {
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO)).thenReturn(Optional.empty());

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(PostergacionRechazadaException.ASIENTO_NO_DISPONIBLE, e.getCodigo());
        sinCambios();
    }

    @Test
    void siLaSesionDeReservaVencioSeRechazaSinTocarNada() {
        when(tokens.validar(anyString(), eq(VIAJE_NUEVO))).thenThrow(new SesionExpiradaException());

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(PostergacionRechazadaException.SESION_VENCIDA, e.getCodigo());
        sinCambios();
    }

    @Test
    void siElPasajeYaNoSePuedeCambiarSeRechazaConElMotivoYSinTocarNada() {
        when(postergaciones.exigirPasajeCambiable(USUARIO, PASAJE)).thenThrow(new PostergacionRechazadaException(
                PostergacionRechazadaException.ANTICIPACION_INSUFICIENTE,
                "Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida."));

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals("Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.", e.getReason());
        sinCambios();
    }

    @Test
    void unPasajeAjenoSigueSiendo404() {
        when(postergaciones.exigirPasajeCambiable(USUARIO, PASAJE))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "no existe"));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(404, e.getStatusCode().value());
        sinCambios();
    }

    @Test
    void siElViajeNuevoYaNoSePuedeReservarSeRechaza() {
        org.mockito.Mockito.doThrow(new ReservaNoPermitidaException("El viaje ya salió."))
                .when(validadorReserva).exigirReservable(VIAJE_NUEVO);

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(PostergacionRechazadaException.VIAJE_NO_RESERVABLE, e.getCodigo());
        sinCambios();
    }

    @Test
    void noSePuedeCambiarAlMismoViaje() {
        when(asientos.findById(VA_ORIGINAL)).thenReturn(Optional.of(asiento(VA_ORIGINAL, 600, 11, "43.00", "OCUPADO")));

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(PostergacionRechazadaException.MISMO_VIAJE, e.getCodigo());
        sinCambios();
    }

    @Test
    void siElPagoNoCubreLaDiferenciaSeRechaza() {
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "60.00", "BLOQUEADO_TEMPORAL")));

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.aplicarCambioPagado(operacion("10.00", "SIM-ABC123")));

        assertEquals(PostergacionRechazadaException.PAGO_INSUFICIENTE, e.getCodigo());
        sinCambios();
    }

    // ---------- varias postergaciones del mismo pasaje: se descuenta lo ya pagado ----------

    /** El pasaje costó 43.00 y en una postergación anterior ya pagó 17.00 de diferencia: lleva pagado 60.00. */
    private void conAdicionalPrevioDe17() {
        when(postergaciones.exigirPasajeCambiable(USUARIO, PASAJE)).thenReturn(fila("12A", VIAJE_ORIGINAL,
                LocalDate.of(2026, 11, 22), "Trujillo", "Lima", "17.00"));
    }

    @Test
    void laSegundaPostergacionSoloCobraLoQueFaltaSobreLoYaPagado() {
        conAdicionalPrevioDe17();
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "70.00", "BLOQUEADO_TEMPORAL")));

        // 70.00 - (43.00 + 17.00) = 10.00. Con el cálculo anterior (70.00 - 43.00) habría pedido 27.00.
        ConfirmacionPostergacionDto r = servicio.aplicarCambioPagado(operacion("10.00", "SIM-SEGUNDA"));

        ArgumentCaptor<Postergacion> captor = ArgumentCaptor.forClass(Postergacion.class);
        verify(historial).save(captor.capture());
        assertEquals(0, new BigDecimal("10.00").compareTo(captor.getValue().getImporteAdicional()));
        assertEquals(0, new BigDecimal("10.00").compareTo(r.importeAdicional()));
    }

    @Test
    void laSegundaPostergacionRechazaUnPagoMenorALaDiferenciaReal() {
        conAdicionalPrevioDe17();
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "70.00", "BLOQUEADO_TEMPORAL")));

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.aplicarCambioPagado(operacion("9.99", "SIM-SEGUNDA")));

        assertEquals(PostergacionRechazadaException.PAGO_INSUFICIENTE, e.getCodigo());
        sinCambios();
    }

    @Test
    void siYaPagoLoSuficienteLaSegundaPostergacionNoCobraNada() {
        conAdicionalPrevioDe17();
        // 55.00 <= 43.00 + 17.00: el nuevo asiento queda cubierto por lo que el pasaje ya pagó.
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "55.00", "BLOQUEADO_TEMPORAL")));

        ConfirmacionPostergacionDto r = servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null));

        assertEquals(0, BigDecimal.ZERO.compareTo(r.importeAdicional()));
        verify(historial).save(any(Postergacion.class));
    }

    @Test
    void sinPostergacionesPreviasSigueCobrandoContraElPrecioDelPasaje() {
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "70.00", "BLOQUEADO_TEMPORAL")));

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.aplicarCambioPagado(operacion("10.00", "SIM-PRIMERA")));

        assertEquals(PostergacionRechazadaException.PAGO_INSUFICIENTE, e.getCodigo(), "70.00 - 43.00 = 27.00");
        sinCambios();
    }

    @Test
    void conImporteLaReferenciaDelPagoEsObligatoria() {
        when(asientos.findByIdViajeAndIdAsiento(600, ASIENTO_NUEVO))
                .thenReturn(Optional.of(asiento(VA_NUEVO, 600, ASIENTO_NUEVO, "60.00", "BLOQUEADO_TEMPORAL")));

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.aplicarCambioPagado(operacion("17.00", " ")));

        assertEquals(PostergacionRechazadaException.PAGO_INSUFICIENTE, e.getCodigo());
        sinCambios();
    }

    // ---------- fallo a mitad de camino: el servicio lanza y la transacción se revierte ----------

    @Test
    void siFallaAlLiberarElAsientoOriginalLanzaParaQueSeRevierteTodo() {
        when(historial.liberarAsientoOcupado(VA_ORIGINAL)).thenReturn(0);

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(PostergacionRechazadaException.CAMBIO_NO_APLICADO, e.getCodigo());
        verify(historial, never()).save(any(Postergacion.class));
        verify(publicador, never()).publishEvent(any(Object.class));
    }

    @Test
    void siNoSePuedeMoverElPasajeLanzaSinGuardarHistorial() {
        when(historial.moverPasajeAlAsiento(PASAJE, VA_ORIGINAL, VA_NUEVO)).thenReturn(0);

        PostergacionRechazadaException e = assertThrows(PostergacionRechazadaException.class,
                () -> servicio.confirmar(USUARIO, PASAJE, solicitud("0.00", null)));

        assertEquals(PostergacionRechazadaException.CAMBIO_NO_APLICADO, e.getCodigo());
        verify(historial, never()).liberarAsientoOcupado(anyInt());
        verify(historial, never()).save(any(Postergacion.class));
    }

    // ---------- datos de prueba ----------

    /** Un rechazo previo a aplicar el cambio no debe haber movido pasaje ni asientos ni guardado historial. */
    void sinCambios() {
        verify(historial, never()).moverPasajeAlAsiento(anyInt(), anyInt(), anyInt());
        verify(historial, never()).liberarAsientoOcupado(anyInt());
        verify(historial, never()).save(any(Postergacion.class));
        verify(publicador, never()).publishEvent(any(Object.class));
    }

    static OperacionPago operacion(String monto, String referencia) {
        OperacionPago o = new OperacionPago();
        o.setIdPasaje(PASAJE);
        o.setIdUsuario(USUARIO);
        o.setIdViaje(VIAJE_NUEVO);
        o.setIdAsientoNuevo(ASIENTO_NUEVO);
        o.setIdSesionReserva(SESION);
        o.setMonto(new BigDecimal(monto));
        o.setReferenciaExterna(referencia);
        return o;
    }

    static ConfirmarPostergacionRequest solicitud(String monto, String referencia) {
        return new ConfirmarPostergacionRequest(VIAJE_NUEVO, ASIENTO_NUEVO, "token", new BigDecimal(monto), referencia);
    }

    static Pasaje pasaje() {
        Pasaje p = new Pasaje();
        p.setIdPasaje(PASAJE);
        p.setIdVenta(VENTA);
        p.setIdPasajero(PASAJERO);
        p.setIdViajeAsiento(VA_ORIGINAL);
        p.setPrecio(new BigDecimal("43.00"));
        return p;
    }

    static ViajeAsiento asiento(int idViajeAsiento, int idViaje, int idAsiento, String precio, String estado) {
        ViajeAsiento va = new ViajeAsiento();
        va.setIdViajeAsiento(idViajeAsiento);
        va.setIdViaje(idViaje);
        va.setIdAsiento(idAsiento);
        va.setPrecio(new BigDecimal(precio));
        va.setEstadoViajeAsiento(estado);
        return va;
    }

    static FilaCompra fila(String numeroAsiento, long idViaje, LocalDate fecha, String origen, String destino) {
        return fila(numeroAsiento, idViaje, fecha, origen, destino, "0.00");
    }

    /** Igual que la anterior, pero con lo ya pagado en postergaciones previas del mismo pasaje. */
    static FilaCompra fila(String numeroAsiento, long idViaje, LocalDate fecha, String origen, String destino,
                           String adicionalPagado) {
        return new FilaCompra(VENTA, "PAGADA", new BigDecimal("43.00"), AHORA.minusDays(1),
                "APROBADO", null, "PEN", null, null, null,
                PASAJE, new BigDecimal("43.00"), "DNI", "12345678", "ANA", "LOPEZ", numeroAsiento, (short) 1,
                idViaje, fecha, LocalTime.of(8, 0), "PROGRAMADO", origen, destino, "Bus Cama",
                new BigDecimal(adicionalPagado));
    }
}
