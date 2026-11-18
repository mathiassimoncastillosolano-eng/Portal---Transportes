package com.transportes.salud.servicios;

import java.sql.Connection;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.LongSupplier;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Revisa rápido si PostgreSQL responde, cuidando el pool pequeño de conexiones:
 * no hace consultas de negocio (solo pide una conexión y la valida);
 * nunca hace esperar más de timeoutMs;
 * si muchos preguntan a la vez, comparten una sola comprobación;
 * un éxito se recuerda durante cacheMs (los fallos no, para notar pronto que volvió).
 */
@Component
public class VerificadorBaseDatos implements DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(VerificadorBaseDatos.class);

    private final DataSource dataSource;
    private final long timeoutMs;
    private final long cacheNanos;
    private final LongSupplier relojNanos;
    private final ExecutorService ejecutor = Executors.newSingleThreadExecutor(tarea -> {
        Thread hilo = new Thread(tarea, "salud-bd");
        hilo.setDaemon(true);
        return hilo;
    });

    private final Object candado = new Object();
    private CompletableFuture<Boolean> enCurso;
    private volatile long ultimoExitoNanos;
    private volatile boolean huboExito;
    private volatile Boolean ultimoEstadoRegistrado;

    @Autowired
    public VerificadorBaseDatos(DataSource dataSource,
            @Value("${salud.bd.timeout-ms:2500}") long timeoutMs,
            @Value("${salud.bd.cache-ms:10000}") long cacheMs) {
        this(dataSource, timeoutMs, cacheMs, System::nanoTime);
    }

    VerificadorBaseDatos(DataSource dataSource, long timeoutMs, long cacheMs, LongSupplier relojNanos) {
        this.dataSource = dataSource;
        this.timeoutMs = Math.max(200, timeoutMs);
        this.cacheNanos = TimeUnit.MILLISECONDS.toNanos(Math.max(0, cacheMs));
        this.relojNanos = relojNanos;
    }

    /** true si la base respondió a tiempo (o respondió hace menos de cacheMs). */
    public boolean disponible() {
        if (huboExito && relojNanos.getAsLong() - ultimoExitoNanos < cacheNanos) {
            return true;
        }

        CompletableFuture<Boolean> intento;
        synchronized (candado) {
            if (enCurso == null || enCurso.isDone()) {
                enCurso = CompletableFuture.supplyAsync(this::comprobar, ejecutor);
            }
            intento = enCurso;
        }

        try {
            return intento.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException excepcion) {
            registrarCambio(false, "sin respuesta en " + timeoutMs + " ms");
            return false;
        } catch (InterruptedException excepcion) {
            Thread.currentThread().interrupt();
            return false;
        } catch (ExecutionException excepcion) {
            return false;
        }
    }

    private boolean comprobar() {
        int segundos = (int) Math.max(1, Math.ceil(timeoutMs / 1000.0));
        try (Connection conexion = dataSource.getConnection()) {
            boolean valida = conexion.isValid(segundos);
            if (valida) {
                ultimoExitoNanos = relojNanos.getAsLong();
                huboExito = true;
            }
            registrarCambio(valida, valida ? null : "conexión no válida");
            return valida;
        } catch (Exception excepcion) {
            // Solo el tipo de error: el mensaje del driver puede traer host o usuario.
            registrarCambio(false, excepcion.getClass().getSimpleName());
            return false;
        }
    }

    /** Escribe en el log solo cuando el estado cambia, para no llenarlo en cada consulta. */
    private void registrarCambio(boolean disponible, String motivo) {
        Boolean anterior = ultimoEstadoRegistrado;
        if (anterior != null && anterior == disponible) {
            return;
        }
        ultimoEstadoRegistrado = disponible;
        if (disponible) {
            log.info("Salud: base de datos disponible");
        } else {
            log.warn("Salud: base de datos no disponible ({})", motivo);
        }
    }

    @Override
    public void destroy() {
        ejecutor.shutdownNow();
    }
}
