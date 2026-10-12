package com.transportes.pagos.mercadopago;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.transportes.pagos.mercadopago.DocumentoPagador.Motivo;

class DocumentoPagadorTest {

    static final Set<String> SOLO_DNI = Set.of("DNI");
    static final Set<String> TODOS = Set.of("DNI", "C.E", "RUC", "Otro");

    @Test
    void dniValidoSeEnviaTalCual() {
        var r = DocumentoPagador.evaluar("DNI", "12345678", SOLO_DNI, Map.of());
        assertTrue(r.enviar());
        assertEquals("DNI", r.tipo());
        assertEquals("12345678", r.numero());
    }

    @Test
    void nuncaSeInventanDigitosNiSeRellenaConCeros() {
        for (String n : new String[] {"1234567", "123456789", "1234567a", "", "  "}) {
            assertFalse(DocumentoPagador.evaluar("DNI", n, SOLO_DNI, Map.of()).enviar(), n);
        }
        assertEquals(Motivo.NUMERO_INVALIDO, DocumentoPagador.evaluar("DNI", "1234567", SOLO_DNI, Map.of()).motivo());
        assertEquals(Motivo.SIN_DATOS, DocumentoPagador.evaluar("DNI", "  ", SOLO_DNI, Map.of()).motivo());
    }

    @Test
    void longitudesDelCatalogoDePeru() {
        assertTrue(DocumentoPagador.numeroValido("C.E", "12345678"));
        assertTrue(DocumentoPagador.numeroValido("C.E", "123456789012"));
        assertFalse(DocumentoPagador.numeroValido("C.E", "1234567"));
        assertFalse(DocumentoPagador.numeroValido("C.E", "1234567890123"));
        assertTrue(DocumentoPagador.numeroValido("RUC", "20123456789"));
        assertFalse(DocumentoPagador.numeroValido("RUC", "2012345678"));
        assertTrue(DocumentoPagador.numeroValido("Otro", "12345"));
        assertFalse(DocumentoPagador.numeroValido("Otro", "1234"));
        assertFalse(DocumentoPagador.numeroValido("Otro", "123456789012345678901"));
    }

    @Test
    void tipoNoHabilitadoSeOmiteSinCambiarloPorOtro() {
        var r = DocumentoPagador.evaluar("C.E", "123456789", SOLO_DNI, Map.of());
        assertEquals(Motivo.TIPO_NO_HABILITADO, r.motivo());
        assertNull(r.tipo());
        assertNull(r.numero());
    }

    @Test
    void sinMapeoExplicitoNoHayConversionAutomatica() {
        var r = DocumentoPagador.evaluar("C.E", "123456789", TODOS, Map.of());
        assertTrue(r.enviar());
        assertEquals("C.E", r.tipo(), "C.E no se convierte en CE, CI ni Otro por su cuenta");
    }

    @Test
    void elMapeoSoloAplicaSiElOperadorLoConfigura() {
        var m = DocumentoPagador.analizarMapeo("C.E=CE");
        var r = DocumentoPagador.evaluar("C.E", "123456789", TODOS, m);
        assertEquals("CE", r.tipo());
        assertEquals("123456789", r.numero());
        assertEquals("DNI", DocumentoPagador.evaluar("DNI", "12345678", TODOS, m).tipo());
    }

    @Test
    void tiposFueraDelCatalogoSeOmiten() {
        for (String t : new String[] {"CE", "ce", "dni", "CI", "LC", "LE", "Pasaporte", null, ""}) {
            assertFalse(DocumentoPagador.evaluar(t, "12345678", TODOS, Map.of()).enviar(), String.valueOf(t));
        }
    }

    @Test
    void analizaConfiguracionMalFormadaSinFallar() {
        assertTrue(DocumentoPagador.analizarMapeo(null).isEmpty());
        assertTrue(DocumentoPagador.analizarMapeo("sin-igual,=x,y=").isEmpty());
        assertEquals(Set.of("DNI", "RUC"), DocumentoPagador.analizarTipos(" DNI , RUC ,, "));
        assertTrue(DocumentoPagador.analizarTipos("").isEmpty());
    }
}
