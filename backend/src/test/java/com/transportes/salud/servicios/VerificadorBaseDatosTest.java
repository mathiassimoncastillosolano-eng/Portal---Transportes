package com.transportes.salud.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class VerificadorBaseDatosTest {

    final AtomicLong reloj = new AtomicLong(0);

    static Connection conexionValida() throws SQLException {
        Connection conexion = mock(Connection.class);
        when(conexion.isValid(anyInt())).thenReturn(true);
        return conexion;
    }

    @Test
    void conexionValidaEsDisponible() throws Exception {
        DataSource ds = mock(DataSource.class);
        Connection conexion = conexionValida();
        when(ds.getConnection()).thenReturn(conexion);

        assertTrue(new VerificadorBaseDatos(ds, 1000, 0, reloj::get).disponible());
    }

    @Test
    void errorDeConexionNoEsDisponible() throws Exception {
        DataSource ds = mock(DataSource.class);
        when(ds.getConnection()).thenThrow(new SQLException("host secreto"));

        assertFalse(new VerificadorBaseDatos(ds, 1000, 0, reloj::get).disponible());
    }

    @Test
    void unaBaseQueNoRespondeSeCortaEnElTimeout() throws Exception {
        CountDownLatch liberar = new CountDownLatch(1);
        DataSource ds = mock(DataSource.class);
        Connection conexion = conexionValida();
        when(ds.getConnection()).thenAnswer(inv -> {
            liberar.await(10, TimeUnit.SECONDS);
            return conexion;
        });
        var verificador = new VerificadorBaseDatos(ds, 300, 0, reloj::get);

        long inicio = System.nanoTime();
        boolean disponible = verificador.disponible();
        long transcurridoMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio);

        assertFalse(disponible);
        assertTrue(transcurridoMs < 2000, "esperó " + transcurridoMs + " ms");
        liberar.countDown();
        verificador.destroy();
    }

    @Test
    void peticionesSimultaneasCompartenUnaSolaComprobacion() throws Exception {
        AtomicInteger conexionesPedidas = new AtomicInteger();
        CountDownLatch liberar = new CountDownLatch(1);
        DataSource ds = mock(DataSource.class);
        Connection conexion = conexionValida();
        when(ds.getConnection()).thenAnswer(inv -> {
            conexionesPedidas.incrementAndGet();
            liberar.await(5, TimeUnit.SECONDS);
            return conexion;
        });
        var verificador = new VerificadorBaseDatos(ds, 3000, 10_000, reloj::get);

        var hilos = Executors.newFixedThreadPool(8);
        List<Future<Boolean>> resultados = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            resultados.add(hilos.submit(verificador::disponible));
        }
        Thread.sleep(200);
        liberar.countDown();
        for (Future<Boolean> resultado : resultados) {
            assertTrue(resultado.get(5, TimeUnit.SECONDS));
        }
        hilos.shutdown();

        assertEquals(1, conexionesPedidas.get());
    }

    @Test
    void elExitoSeReutilizaDuranteLaCacheYLuegoSeVuelveAComprobar() throws Exception {
        AtomicInteger conexionesPedidas = new AtomicInteger();
        DataSource ds = mock(DataSource.class);
        Connection conexion = conexionValida();
        when(ds.getConnection()).thenAnswer(inv -> {
            conexionesPedidas.incrementAndGet();
            return conexion;
        });
        var verificador = new VerificadorBaseDatos(ds, 1000, 10_000, reloj::get);

        assertTrue(verificador.disponible());
        reloj.addAndGet(TimeUnit.SECONDS.toNanos(5));
        assertTrue(verificador.disponible());
        assertEquals(1, conexionesPedidas.get());

        reloj.addAndGet(TimeUnit.SECONDS.toNanos(6));
        assertTrue(verificador.disponible());
        assertEquals(2, conexionesPedidas.get());
    }
}
