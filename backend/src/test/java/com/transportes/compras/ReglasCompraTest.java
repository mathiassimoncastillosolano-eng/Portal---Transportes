package com.transportes.compras;

import static com.transportes.compras.reglas.ReglasCompra.EstadoCompra.CONFIRMADA;
import static com.transportes.compras.reglas.ReglasCompra.EstadoCompra.REEMBOLSADA;
import static com.transportes.compras.reglas.ReglasCompra.EstadoCompra.SIN_CONFIRMAR;
import static com.transportes.compras.reglas.ReglasCompra.FaseViaje.NO_REALIZADO;
import static com.transportes.compras.reglas.ReglasCompra.FaseViaje.PROXIMO;
import static com.transportes.compras.reglas.ReglasCompra.FaseViaje.REALIZADO;
import static com.transportes.compras.reglas.ReglasCompra.FaseViaje.SIN_INFORMACION;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.junit.jupiter.api.Test;

import com.transportes.compras.reglas.ReglasCompra;

/** Reglas puras: no requieren Spring ni base de datos. */
class ReglasCompraTest {

    static final LocalDate DIA = LocalDate.of(2026, 10, 19);
    static final LocalTime OCHO = LocalTime.of(8, 0);

    @Test
    void soloVentaPagadaConPagoAprobadoEsConfirmada() {
        assertEquals(CONFIRMADA, ReglasCompra.estadoCompra("PAGADA", "APROBADO", null));
        assertEquals(CONFIRMADA, ReglasCompra.estadoCompra(" pagada ", "aprobado", "APROBADO"));
    }

    @Test
    void existirUnaVentaNoBastaParaConfirmarla() {
        assertEquals(SIN_CONFIRMAR, ReglasCompra.estadoCompra("PAGADA", null, null));
        assertEquals(SIN_CONFIRMAR, ReglasCompra.estadoCompra("PAGADA", "PENDIENTE", null));
        assertEquals(SIN_CONFIRMAR, ReglasCompra.estadoCompra("PENDIENTE", "APROBADO", null));
        assertEquals(SIN_CONFIRMAR, ReglasCompra.estadoCompra(null, null, null));
    }

    @Test
    void unaOperacionReembolsadaNuncaSeMuestraComoConfirmada() {
        assertEquals(REEMBOLSADA, ReglasCompra.estadoCompra("PAGADA", "APROBADO", "REEMBOLSADO"));
    }

    @Test
    void faseDelViajeDependeDelEstadoYDelRelojDeNegocio() {
        assertEquals(PROXIMO, ReglasCompra.faseViaje("PROGRAMADO", DIA, OCHO, DIA.atTime(7, 59, 59)));
        // A la hora exacta de salida el viaje ya salió (mismo criterio que PoliticaReservaViaje).
        assertEquals(REALIZADO, ReglasCompra.faseViaje("PROGRAMADO", DIA, OCHO, DIA.atTime(8, 0)));
        assertEquals(REALIZADO, ReglasCompra.faseViaje("PROGRAMADO", DIA, OCHO, DIA.plusDays(3).atStartOfDay()));
    }

    @Test
    void unViajeCanceladoNoSeConsideraRealizadoAunqueSuFechaYaPaso() {
        LocalDateTime despues = DIA.plusDays(5).atStartOfDay();
        assertEquals(NO_REALIZADO, ReglasCompra.faseViaje("CANCELADO", DIA, OCHO, despues));
        assertEquals(NO_REALIZADO, ReglasCompra.faseViaje("SUSPENDIDO", DIA, OCHO, despues));
    }

    @Test
    void sinDatosDelViajeLaFaseEsSinInformacion() {
        LocalDateTime ahora = DIA.atStartOfDay();
        assertEquals(SIN_INFORMACION, ReglasCompra.faseViaje(null, DIA, OCHO, ahora));
        assertEquals(SIN_INFORMACION, ReglasCompra.faseViaje("PROGRAMADO", null, OCHO, ahora));
        assertEquals(SIN_INFORMACION, ReglasCompra.faseViaje("PROGRAMADO", DIA, null, ahora));
    }

    @Test
    void vigenteExigeCompraConfirmadaYViajeProximo() {
        assertTrue(ReglasCompra.esVigente(CONFIRMADA, PROXIMO));
        assertFalse(ReglasCompra.esVigente(CONFIRMADA, REALIZADO));
        assertFalse(ReglasCompra.esVigente(CONFIRMADA, NO_REALIZADO));
        assertFalse(ReglasCompra.esVigente(SIN_CONFIRMAR, PROXIMO));
        assertFalse(ReglasCompra.esVigente(REEMBOLSADA, PROXIMO));
    }

    @Test
    void elDocumentoSoloSeEmiteParaComprasConfirmadasConViajeNoCancelado() {
        assertTrue(ReglasCompra.documentoDisponible(CONFIRMADA, PROXIMO));
        assertTrue(ReglasCompra.documentoDisponible(CONFIRMADA, REALIZADO));
        assertFalse(ReglasCompra.documentoDisponible(CONFIRMADA, NO_REALIZADO));
        assertFalse(ReglasCompra.documentoDisponible(CONFIRMADA, SIN_INFORMACION));
        assertFalse(ReglasCompra.documentoDisponible(REEMBOLSADA, PROXIMO));
        assertFalse(ReglasCompra.documentoDisponible(SIN_CONFIRMAR, PROXIMO));
    }

    @Test
    void elDocumentoDelPasajeroSeEnmascara() {
        assertEquals("DNI ****678", ReglasCompra.enmascararDocumento("DNI", "12345678"));
        assertEquals("CE ****", ReglasCompra.enmascararDocumento("CE", "12"));
        assertEquals("****789", ReglasCompra.enmascararDocumento(null, "123456789"));
        assertNull(ReglasCompra.enmascararDocumento("DNI", null));
        assertNull(ReglasCompra.enmascararDocumento("DNI", "  "));
    }
}
