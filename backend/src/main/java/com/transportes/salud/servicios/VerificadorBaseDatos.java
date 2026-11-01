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
 * Comprobación ligera de conectividad con PostgreSQL (Supabase) para el endpoint de readiness.
 *
 * <p>Diseño pensado para un pool pequeño (Hikari maximum-pool-size=3) y para muchos clientes
 * consultando a la vez mientras el backend despierta:</p>
 * <ul>
 * <li><b>Sin consultas de negocio:</b> solo pide una conexión al pool y ejecuta
 * {@link Connection#isValid(int)} (el driver de PostgreSQL envía una consulta vacía).</li>
 * <li><b>Tiempo de espera controlado:</b> quien pregunta nunca espera más de {@code timeoutMs},
 * aunque Hikari tenga un connection-timeout mayor. La comprobación lenta sigue en su hilo y su
 * resultado se aprovecha en la siguiente consulta.</li>
 * <li><b>Una sola comprobación en curso:</b> las peticiones simultáneas comparten el mismo intento,
 * así N clientes haciendo polling no consumen N conexiones.</li>
 * <li><b>Caché del éxito:</b> un resultado positivo se reutiliza durante {@code cacheMs}; los
 * fallos no se cachean para detectar la recuperación cuanto antes.</li>
 * </ul>
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

    /** {@code true} si la base de datos respondió a tiempo (o respondió hace menos de {@code cacheMs}). */
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
            // Solo el tipo de excepción: el mensaje del driver puede incluir host o usuario.
            registrarCambio(false, excepcion.getClass().getSimpleName());
            return false;
        }
    }

    /** Registra únicamente las transiciones para no llenar el log con cada consulta de polling. */
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
