package com.transportes.pagos.mercadopago;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;

class ValidadorFirmaWebhookTest {

    static final String SECRETO = "clave-secreta-de-prueba";
    final ValidadorFirmaWebhook validador = new ValidadorFirmaWebhook(SECRETO, 0);

    /** HMAC calculado de forma independiente (no reutiliza el código bajo prueba). */
    static String hmac(String manifiesto) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRETO.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(manifiesto.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void manifiestoSigueElFormatoOficial() {
        assertEquals("id:ORD01ABC;request-id:req-1;ts:1704908010;", ValidadorFirmaWebhook.manifiesto("ORD01ABC", "req-1", "1704908010"));
        assertEquals("request-id:req-1;ts:1;", ValidadorFirmaWebhook.manifiesto(null, "req-1", "1"));
        assertEquals("ts:1;", ValidadorFirmaWebhook.manifiesto(null, null, "1"));
    }

    @Test
    void aceptaFirmaValidaEnCualquierOrdenYConEspacios() throws Exception {
        String v1 = hmac("id:ORD01ABC;request-id:req-1;ts:1704908010;");
        assertTrue(validador.esValida("ts=1704908010,v1=" + v1, "req-1", "ORD01ABC"));
        assertTrue(validador.esValida(" v1=" + v1 + " , ts=1704908010 ", "req-1", "ORD01ABC"));
    }

    @Test
    void aceptaLaVarianteConDataIdEnMinusculas() throws Exception {
        String v1 = hmac("id:ord01abc;request-id:req-1;ts:1704908010;");
        assertTrue(validador.esValida("ts=1704908010,v1=" + v1, "req-1", "ORD01ABC"));
    }

    @Test
    void rechazaFirmasAlteradasOIncompletas() throws Exception {
        String v1 = hmac("id:ORD01ABC;request-id:req-1;ts:1704908010;");
        assertFalse(validador.esValida("ts=1704908010,v1=" + v1, "req-2", "ORD01ABC"), "otro request-id");
        assertFalse(validador.esValida("ts=1704908011,v1=" + v1, "req-1", "ORD01ABC"), "otro ts");
        assertFalse(validador.esValida("ts=1704908010,v1=" + v1, "req-1", "ORD01ABD"), "otro data.id");
        assertFalse(validador.esValida("v1=" + v1, "req-1", "ORD01ABC"), "sin ts");
        assertFalse(validador.esValida("ts=1704908010", "req-1", "ORD01ABC"), "sin v1");
        assertFalse(validador.esValida(null, "req-1", "ORD01ABC"));
        assertFalse(validador.esValida("basura", "req-1", "ORD01ABC"));
        assertFalse(validador.esValida("ts=abc,v1=" + v1, "req-1", "ORD01ABC"));
        assertFalse(new ValidadorFirmaWebhook("", 0).esValida("ts=1704908010,v1=" + v1, "req-1", "ORD01ABC"),
                "sin clave configurada nunca es válida");
        assertFalse(new ValidadorFirmaWebhook("otra-clave", 0).esValida("ts=1704908010,v1=" + v1, "req-1", "ORD01ABC"));
    }

    @Test
    void toleranciaOpcionalDeTiempo() throws Exception {
        ValidadorFirmaWebhook conTolerancia = new ValidadorFirmaWebhook(SECRETO, 300);
        String v1 = hmac("id:ORD1;request-id:r;ts:1704908010;");
        assertTrue(conTolerancia.esValida("ts=1704908010,v1=" + v1, "r", "ORD1", Instant.ofEpochSecond(1704908100)));
        assertFalse(conTolerancia.esValida("ts=1704908010,v1=" + v1, "r", "ORD1", Instant.ofEpochSecond(1704909000)));
    }

    @Test
    void diagnosticaElMotivoDelRechazoSinRevelarFirmaNiClave() throws Exception {
        String v1 = hmac("id:ORD01ABC;request-id:req-1;ts:1704908010;");
        assertTrue(validador.diagnosticar(null, "r", "ORD1").contains("sin cabecera"));
        assertTrue(validador.diagnosticar("basura", "r", "ORD1").contains("mal formada"));
        assertTrue(validador.diagnosticar("ts=abc,v1=" + v1, "r", "ORD1").contains("ts no numérico"));
        assertTrue(validador.diagnosticar("ts=1,v1=1234", "r", "ORD1").contains("v1 no es HMAC"));
        assertTrue(validador.diagnosticar("ts=1,v1=" + v1, null, "ORD1").contains("faltan"));
        String noCoincide = validador.diagnosticar("ts=1,v1=" + v1, "req-1", "ORD01ABC");
        assertTrue(noCoincide.contains("no coincide"));
        assertFalse(noCoincide.contains(v1));
        assertFalse(noCoincide.contains(SECRETO));
        assertTrue(new ValidadorFirmaWebhook("", 0).diagnosticar("ts=1,v1=" + v1, "r", "i").contains("no configurada"));
    }

    @Test
    void sinClaveConfiguradaNingunaFirmaEsValida() throws Exception {
        String v1 = hmac("id:ORD01ABC;request-id:req-1;ts:1704908010;");
        assertFalse(new ValidadorFirmaWebhook("", 0).esValida("ts=1704908010,v1=" + v1, "req-1", "ORD01ABC"));
    }

    @Test
    void firmaMalformadaOVaciaNuncaEsValida() {
        for (String f : new String[] {null, "", "   ", "ts=", "v1=", "ts=1", "v1=abc", "ts=x,v1=y", ",,,", "ts=1,v1="}) {
            assertFalse(validador.esValida(f, "r", "ORD1"), String.valueOf(f));
        }
    }
}
