package com.transportes.auth.servicios;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class LimitadorVentanaTest {

    final AtomicLong reloj = new AtomicLong(0);

    private long segundos(long s) {
        return Duration.ofSeconds(s).toNanos();
    }

    @Test void permiteHastaElMaximoYLuegoBloqueaSinRegistrarLosRechazados() {
        var limitador = new LimitadorVentana(3, Duration.ofSeconds(60), reloj::get);
        assertTrue(limitador.permitir("a"));
        assertTrue(limitador.permitir("a"));
        assertTrue(limitador.permitir("a"));
        assertFalse(limitador.permitir("a"));
        assertFalse(limitador.permitir("a"));
        assertEquals(3, limitador.cantidad("a"));
    }

    @Test void lasClavesSonIndependientes() {
        var limitador = new LimitadorVentana(1, Duration.ofSeconds(60), reloj::get);
        assertTrue(limitador.permitir("a"));
        assertTrue(limitador.permitir("b"));
        assertFalse(limitador.permitir("a"));
    }

    @Test void laVentanaSeDeslizaYLiberaCupo() {
        var limitador = new LimitadorVentana(1, Duration.ofSeconds(60), reloj::get);
        assertTrue(limitador.permitir("a"));
        reloj.set(segundos(59));
        assertFalse(limitador.permitir("a"));
        reloj.set(segundos(60));
        assertTrue(limitador.permitir("a"));
    }

    @Test void conVentanaCeroNuncaBloquea() {
        var limitador = new LimitadorVentana(1, Duration.ZERO, reloj::get);
        for (int i = 0; i < 20; i++) assertTrue(limitador.permitir("a"));
    }

    @Test void registrarCuentaFallosYReiniciarLosBorra() {
        var limitador = new LimitadorVentana(Integer.MAX_VALUE, Duration.ofMinutes(15), reloj::get);
        assertEquals(1, limitador.registrar("m"));
        assertEquals(2, limitador.registrar("m"));
        assertEquals(2, limitador.cantidad("m"));
        limitador.reiniciar("m");
        assertEquals(0, limitador.cantidad("m"));
        assertEquals(0, limitador.cantidad("desconocida"));
    }

    @Test void purgarEliminaLasClavesVencidas() {
        var limitador = new LimitadorVentana(5, Duration.ofSeconds(10), reloj::get);
        limitador.registrar("a");
        reloj.set(segundos(11));
        limitador.purgar();
        assertEquals(0, limitador.cantidad("a"));
    }

    @Test void esSeguroConHilosConcurrentes() throws Exception {
        var limitador = new LimitadorVentana(50, Duration.ofMinutes(1));
        var permitidos = new java.util.concurrent.atomic.AtomicInteger();
        var hilos = new Thread[16];
        for (int i = 0; i < hilos.length; i++) {
            hilos[i] = new Thread(() -> {
                for (int j = 0; j < 100; j++) if (limitador.permitir("x")) permitidos.incrementAndGet();
            });
            hilos[i].start();
        }
        for (Thread h : hilos) h.join();
        assertEquals(50, permitidos.get());
    }
}
