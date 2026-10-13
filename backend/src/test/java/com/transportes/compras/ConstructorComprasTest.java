package com.transportes.compras;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.transportes.compras.dto.CompraDto;
import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.dto.FilaResumen;
import com.transportes.compras.dto.ResumenPerfilDto;
import com.transportes.compras.reglas.ConstructorCompras;

/** Agrupación de filas en compras, orden e indicadores del perfil, sin base de datos. */
class ConstructorComprasTest {

    static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 12, 10, 0);
    static final LocalDate FUTURO = LocalDate.of(2026, 10, 19);
    static final LocalDate PASADO = LocalDate.of(2026, 9, 1);
    static final LocalTime OCHO = LocalTime.of(8, 0);

    /** Una fila (un pasaje) de una venta confirmada de Lima a Cusco. */
    static FilaCompra fila(int venta, int pasaje, String asiento, String precio, String total,
                           LocalDate fecha, long viaje) {
        return new FilaCompra(venta, "PAGADA", new BigDecimal(total), AHORA.minusDays(1),
                "APROBADO", null, "PEN", null, null, null,
                pasaje, new BigDecimal(precio), "DNI", "1234567" + pasaje, "ANA", "LOPEZ " + pasaje,
                asiento, (short) 1, viaje, fecha, OCHO, "PROGRAMADO", "Lima", "Cusco", "Bus Cama");
    }

    static FilaCompra conEstados(FilaCompra base, String estadoVenta, String estadoPago, String estadoOperacion,
                                 String estadoViaje) {
        return new FilaCompra(base.idVenta(), estadoVenta, base.montoTotal(), base.fechaVenta(),
                estadoPago, estadoOperacion, base.moneda(), null, null, null,
                base.idPasaje(), base.precioPasaje(), base.tipoDocumento(), base.numeroDocumento(),
                base.nombres(), base.apellidos(), base.numeroAsiento(), base.piso(),
                base.idViaje(), base.fechaSalida(), base.horaSalida(), estadoViaje,
                base.origen(), base.destino(), base.tipoBus());
    }

    @Test
    void unaCompraConDosPasajesMuestraDosBoletosYUnSoloTotal() {
        List<CompraDto> compras = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "190.00", FUTURO, 5),
                fila(7, 21, "12B", "95.00", "190.00", FUTURO, 5)), AHORA);

        assertEquals(1, compras.size());
        CompraDto compra = compras.get(0);
        assertEquals("RL-C-000007", compra.codigoCompra());
        assertEquals("CONFIRMADA", compra.estado());
        assertEquals("PROXIMO", compra.fase());
        assertTrue(compra.vigente());
        assertTrue(compra.documentoDisponible());
        assertFalse(compra.incompleta());
        assertEquals("Lima", compra.origen());
        assertEquals("Cusco", compra.destino());
        assertEquals("08:00", compra.horaSalida());
        assertEquals("Bus Cama", compra.tipoBus());
        assertEquals(2, compra.boletos().size());
        assertEquals("12A", compra.boletos().get(0).asiento());
        assertEquals("12B", compra.boletos().get(1).asiento());
        assertEquals("RL-B-000020", compra.boletos().get(0).numeroBoleto());
        assertEquals("DNI ****720", compra.boletos().get(0).documento());
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.total()));
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.totalPasajes()));
        assertTrue(compra.totalConsistente());
        assertEquals("PEN", compra.moneda());
    }

    @Test
    void unPasajeRepetidoPorUnJoinNoDuplicaBoletosNiImportes() {
        FilaCompra a = fila(7, 20, "12A", "95.00", "190.00", FUTURO, 5);
        FilaCompra b = fila(7, 21, "12B", "95.00", "190.00", FUTURO, 5);
        CompraDto compra = ConstructorCompras.agrupar(List.of(a, b, a, b), AHORA).get(0);

        assertEquals(2, compra.boletos().size());
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.totalPasajes()));
        assertTrue(compra.totalConsistente());
    }

    @Test
    void siElTotalDeLaVentaNoCoincideConLosPasajesSeIndicaSinOcultarlo() {
        CompraDto compra = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "200.00", FUTURO, 5),
                fila(7, 21, "12B", "95.00", "200.00", FUTURO, 5)), AHORA).get(0);

        assertEquals(0, new BigDecimal("200.00").compareTo(compra.total()));
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.totalPasajes()));
        assertFalse(compra.totalConsistente());
    }

    @Test
    void unaVentaSinPasajesSeDevuelveComoIncompleta() {
        FilaCompra sinPasaje = new FilaCompra(9, "PAGADA", new BigDecimal("50.00"), AHORA, "APROBADO", null, null,
                null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null);
        CompraDto compra = ConstructorCompras.agrupar(List.of(sinPasaje), AHORA).get(0);

        assertTrue(compra.incompleta());
        assertTrue(compra.boletos().isEmpty());
        assertEquals("SIN_INFORMACION", compra.fase());
        assertFalse(compra.vigente());
        assertFalse(compra.documentoDisponible());
        assertNull(compra.origen());
        assertEquals("PEN", compra.moneda());
    }

    @Test
    void elEstadoDeLaCompraNoSeDeduceDeLaFechaDelViaje() {
        FilaCompra pendiente = conEstados(fila(1, 1, "1A", "50.00", "50.00", FUTURO, 5), "PAGADA", "PENDIENTE", null, "PROGRAMADO");
        CompraDto compra = ConstructorCompras.agrupar(List.of(pendiente), AHORA).get(0);
        assertEquals("SIN_CONFIRMAR", compra.estado());
        assertFalse(compra.vigente());
        assertFalse(compra.documentoDisponible());
    }

    @Test
    void unViajeCanceladoNoEsVigenteNiRealizadoNiTieneDocumento() {
        FilaCompra cancelada = conEstados(fila(1, 1, "1A", "50.00", "50.00", FUTURO, 5), "PAGADA", "APROBADO", null, "CANCELADO");
        CompraDto compra = ConstructorCompras.agrupar(List.of(cancelada), AHORA).get(0);
        assertEquals("CONFIRMADA", compra.estado());
        assertEquals("CANCELADO", compra.estadoViaje());
        assertEquals("NO_REALIZADO", compra.fase());
        assertFalse(compra.vigente());
        assertFalse(compra.documentoDisponible());
    }

    @Test
    void lasVigentesVanPrimeroPorSalidaCercanaYLuegoElResto() {
        List<CompraDto> compras = ConstructorCompras.agrupar(List.of(
                fila(1, 1, "1A", "50.00", "50.00", PASADO, 1),                 // pasada
                fila(2, 2, "2A", "50.00", "50.00", FUTURO.plusDays(10), 2),    // vigente lejana
                fila(3, 3, "3A", "50.00", "50.00", FUTURO, 3),                 // vigente cercana
                fila(4, 4, "4A", "50.00", "50.00", PASADO.minusDays(30), 4)),  // pasada antigua
                AHORA);

        List<CompraDto> orden = ConstructorCompras.ordenarParaPasajes(compras);
        assertEquals(List.of(3, 2, 1, 4), orden.stream().map(CompraDto::idVenta).toList());
        assertEquals(2, ConstructorCompras.contarVigentes(compras));
    }

    @Test
    void elHistorialExcluyeLasVigentesYVaDeLoMasRecienteAAntiguo() {
        List<CompraDto> compras = ConstructorCompras.agrupar(List.of(
                fila(1, 1, "1A", "50.00", "50.00", PASADO.minusDays(30), 1),
                fila(2, 2, "2A", "50.00", "50.00", FUTURO, 2),
                fila(3, 3, "3A", "50.00", "50.00", PASADO, 3)), AHORA);

        List<CompraDto> historial = ConstructorCompras.paraHistorial(compras);
        assertEquals(List.of(3, 1), historial.stream().map(CompraDto::idVenta).toList());
        assertEquals("REALIZADO", historial.get(0).fase());
    }

    @Test
    void elResumenNoDuplicaPasajesNiViajesYSoloCuentaComprasConfirmadas() {
        List<FilaResumen> filas = new ArrayList<>();
        // Venta 1: confirmada, viaje 10 próximo, 2 pasajes.
        filas.add(resumen(1, "PAGADA", "APROBADO", null, 100, 10, FUTURO, "PROGRAMADO"));
        filas.add(resumen(1, "PAGADA", "APROBADO", null, 101, 10, FUTURO, "PROGRAMADO"));
        // Ventas 2 y 3: confirmadas, MISMO viaje pasado 11 (un viaje, dos compras).
        filas.add(resumen(2, "PAGADA", "APROBADO", null, 102, 11, PASADO, "PROGRAMADO"));
        filas.add(resumen(3, "PAGADA", "APROBADO", null, 103, 11, PASADO, "PROGRAMADO"));
        // Venta 4: confirmada pero el viaje fue cancelado: cuenta como pasaje, no como ticket ni viaje.
        filas.add(resumen(4, "PAGADA", "APROBADO", null, 104, 12, PASADO, "CANCELADO"));
        // Venta 5: reembolsada. Venta 6: pago sin aprobar. No cuentan.
        filas.add(resumen(5, "PAGADA", "APROBADO", "REEMBOLSADO", 105, 13, PASADO, "PROGRAMADO"));
        filas.add(resumen(6, "PAGADA", "PENDIENTE", null, 106, 14, FUTURO, "PROGRAMADO"));
        // Filas repetidas por un join no deben sumar de nuevo.
        filas.add(resumen(1, "PAGADA", "APROBADO", null, 100, 10, FUTURO, "PROGRAMADO"));

        ResumenPerfilDto r = ConstructorCompras.resumen(filas, AHORA);
        assertEquals(5, r.pasajes());            // 100,101,102,103,104
        assertEquals(1, r.viajesCompletados());  // solo el viaje 11 (una vez)
        assertEquals(4, r.tickets());            // 100,101,102,103 (la cancelada no)
        assertEquals(1, r.comprasVigentes());    // solo la venta 1
    }

    @Test
    void sinComprasElResumenEstaEnCero() {
        ResumenPerfilDto r = ConstructorCompras.resumen(List.of(), AHORA);
        assertEquals(0, r.pasajes());
        assertEquals(0, r.viajesCompletados());
        assertEquals(0, r.tickets());
        assertEquals(0, r.comprasVigentes());
    }

    static FilaResumen resumen(int venta, String estadoVenta, String estadoPago, String estadoOperacion,
                               int pasaje, long viaje, LocalDate fecha, String estadoViaje) {
        return new FilaResumen(venta, estadoVenta, estadoPago, estadoOperacion, pasaje, viaje, fecha, OCHO, estadoViaje);
    }
}
