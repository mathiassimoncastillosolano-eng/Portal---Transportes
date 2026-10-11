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
}
