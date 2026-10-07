package com.transportes.auth.servicios;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class CriptoRecuperacionTest {

    static final String SECRETO = "secreto-de-pruebas-de-recuperacion-solo-local-0123456789";
    final CriptoRecuperacion cripto = new CriptoRecuperacion(SECRETO);

    @Test void rechazaSecretosCortos() {
        assertThrows(IllegalStateException.class, () -> new CriptoRecuperacion("corto"));
        assertThrows(IllegalStateException.class, () -> new CriptoRecuperacion(null));
    }

    @Test void generaCodigosNumericosDeLaLongitudPedida() {
        Set<String> distintos = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            String codigo = cripto.generarCodigo(6);
            assertTrue(codigo.matches("\\d{6}"), codigo);
            distintos.add(codigo);
        }
        assertTrue(distintos.size() > 400, "los codigos deben variar: " + distintos.size());
    }

    @Test void elHashTiene64HexadecimalesYNoContieneElCodigo() {
        String hash = cripto.hashCodigo(7, "123456");
        assertEquals(64, hash.length());
        assertTrue(hash.matches("[0-9a-f]{64}"));
        assertFalse(hash.contains("123456"));
    }

    @Test void elHashEsDeterministaYDependeDelUsuarioDelCodigoYDelSecreto() {
        assertEquals(cripto.hashCodigo(7, "123456"), cripto.hashCodigo(7, "123456"));
        assertNotEquals(cripto.hashCodigo(7, "123456"), cripto.hashCodigo(8, "123456"));
        assertNotEquals(cripto.hashCodigo(7, "123456"), cripto.hashCodigo(7, "123457"));
        var otro = new CriptoRecuperacion("otro-secreto-distinto-de-al-menos-32-caracteres!!");
        assertNotEquals(cripto.hashCodigo(7, "123456"), otro.hashCodigo(7, "123456"));
    }

    @Test void compararEsExactoYTolerarNulos() {
        assertTrue(CriptoRecuperacion.iguales("abc", "abc"));
        assertFalse(CriptoRecuperacion.iguales("abc", "abd"));
        assertFalse(CriptoRecuperacion.iguales("abc", "abcd"));
        assertFalse(CriptoRecuperacion.iguales(null, "abc"));
        assertFalse(CriptoRecuperacion.iguales("abc", null));
    }

    @Test void laPruebaValidaDevuelveElIdDelDesafio() {
        Instant ahora = Instant.parse("2026-10-06T12:00:00Z");
        String prueba = cripto.emitirPrueba(42L, ahora.plusSeconds(600));
        assertEquals(42L, cripto.validarPrueba(prueba, ahora).getAsLong());
    }

    @Test void laPruebaVencidaSeRechaza() {
        Instant ahora = Instant.parse("2026-10-06T12:00:00Z");
        String prueba = cripto.emitirPrueba(42L, ahora.plusSeconds(600));
        assertTrue(cripto.validarPrueba(prueba, ahora.plusSeconds(600)).isEmpty());
        assertTrue(cripto.validarPrueba(prueba, ahora.plusSeconds(3600)).isEmpty());
    }

    @Test void laPruebaAlteradaOAjenaSeRechaza() {
        Instant ahora = Instant.parse("2026-10-06T12:00:00Z");
        String prueba = cripto.emitirPrueba(42L, ahora.plusSeconds(600));
        String[] partes = prueba.split("\\.");

        // cuerpo cambiado (otro id) con la firma original
        String otroCuerpo = cripto.emitirPrueba(43L, ahora.plusSeconds(600)).split("\\.")[0];
        assertTrue(cripto.validarPrueba(otroCuerpo + "." + partes[1], ahora).isEmpty());
        // firma truncada o vacia
        assertTrue(cripto.validarPrueba(partes[0] + "." + partes[1].substring(1), ahora).isEmpty());
        assertTrue(cripto.validarPrueba(partes[0] + ".", ahora).isEmpty());
        // basura
        assertTrue(cripto.validarPrueba(null, ahora).isEmpty());
        assertTrue(cripto.validarPrueba("", ahora).isEmpty());
        assertTrue(cripto.validarPrueba("a.b.c", ahora).isEmpty());
        assertTrue(cripto.validarPrueba("x".repeat(600), ahora).isEmpty());
        // firmada por otro servidor
        var otro = new CriptoRecuperacion("otro-secreto-distinto-de-al-menos-32-caracteres!!");
        assertTrue(otro.validarPrueba(prueba, ahora).isEmpty());
    }

    @Test void dosPruebasDelMismoDesafioSonDistintas() {
        Instant expira = Instant.parse("2026-10-06T12:10:00Z");
        assertNotEquals(cripto.emitirPrueba(1L, expira), cripto.emitirPrueba(1L, expira));
    }
}
