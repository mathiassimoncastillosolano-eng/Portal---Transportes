package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.transportes.postergacion.reglas.ComparacionTarifaCambio;
import com.transportes.postergacion.reglas.ComparacionTarifaCambio.Escenario;
import com.transportes.postergacion.reglas.ComparacionTarifaCambio.Resultado;

/** Comparación de tarifas del cambio de viaje: igual, mayor o menor. */
class ComparacionTarifaCambioTest {

    static BigDecimal soles(String monto) {
        return new BigDecimal(monto);
    }

    @Test
    void mismaTarifaNoTieneCobro() {
        Resultado r = ComparacionTarifaCambio.comparar(soles("43.00"), soles("43"));
        assertEquals(Escenario.IGUAL, r.escenario());
        assertEquals(soles("0.00"), r.montoAPagar());
        assertEquals(soles("0.00"), r.montoNoDevuelto());
        assertFalse(r.requierePago());
        assertFalse(r.requiereAceptacion());
    }

    @Test
    void tarifaMayorCobraSoloLaDiferencia() {
        Resultado r = ComparacionTarifaCambio.comparar(soles("43.00"), soles("55.00"));
        assertEquals(Escenario.SUPERIOR, r.escenario());
        assertEquals(soles("12.00"), r.montoAPagar());
        assertEquals(soles("0.00"), r.montoNoDevuelto());
        assertTrue(r.requierePago());
    }

    @Test
    void tarifaMenorNoDevuelveLaDiferencia() {
        Resultado r = ComparacionTarifaCambio.comparar(soles("43.00"), soles("35.00"));
        assertEquals(Escenario.INFERIOR, r.escenario());
        assertEquals(soles("0.00"), r.montoAPagar());
        assertEquals(soles("8.00"), r.montoNoDevuelto());
        assertTrue(r.requiereAceptacion());
    }

    @Test
    void lasDiferenciasDeCambiosAnterioresCuentanComoPagadas() {
        // Pagó 43 + 12 de un cambio anterior = 55. Pasar a otro viaje de 55 no cobra nada.
        BigDecimal pagado = ComparacionTarifaCambio.importePagado(soles("43.00"), soles("12.00"));
        assertEquals(soles("55.00"), pagado);
        assertEquals(Escenario.IGUAL, ComparacionTarifaCambio.comparar(pagado, soles("55.00")).escenario());
    }

    @Test
    void sinAdicionalPrevioSoloCuentaElPrecioDelPasaje() {
        assertEquals(soles("43.00"), ComparacionTarifaCambio.importePagado(soles("43.00"), null));
    }

    @Test
    void losCentimosSeCalculanExactos() {
        // Con double, 10.10 + 0.20 no da exactamente 10.30; con BigDecimal sí.
        BigDecimal pagado = ComparacionTarifaCambio.importePagado(soles("10.10"), soles("0.20"));
        Resultado r = ComparacionTarifaCambio.comparar(pagado, soles("10.30"));
        assertEquals(Escenario.IGUAL, r.escenario());

        Resultado conUnCentimo = ComparacionTarifaCambio.comparar(soles("43.00"), soles("43.01"));
        assertEquals(Escenario.SUPERIOR, conUnCentimo.escenario());
        assertEquals(soles("0.01"), conUnCentimo.montoAPagar());
    }
}
