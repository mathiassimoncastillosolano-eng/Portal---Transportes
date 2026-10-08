package com.transportes.auth.servicios;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * Limitador de ventana deslizante en memoria. Es una defensa por instancia contra
 * el abuso (por IP o por correo); la defensa por cuenta que debe sobrevivir a
 * reinicios (intentos y solicitudes por hora) esta en la base de datos.
 */
public final class LimitadorVentana {

    private static final int MAXIMO_CLAVES = 200_000;

    private final int maximo;
    private final long ventanaNanos;
    private final LongSupplier reloj;
    private final ConcurrentHashMap<String, ArrayDeque<Long>> eventos = new ConcurrentHashMap<>();

    public LimitadorVentana(int maximo, Duration ventana) {
        this(maximo, ventana, System::nanoTime);
    }

    LimitadorVentana(int maximo, Duration ventana, LongSupplier reloj) {
        this.maximo = maximo;
        this.ventanaNanos = ventana.toNanos();
        this.reloj = reloj;
    }

    /** Registra el evento y devuelve true si aun cabe en la ventana; si no, devuelve false sin registrarlo. */
    public boolean permitir(String clave) {
        long ahora = reloj.getAsLong();
        boolean[] permitido = {false};
        if (eventos.size() > MAXIMO_CLAVES) {
            purgar();
        }
        eventos.compute(clave, (k, cola) -> {
            ArrayDeque<Long> actual = cola == null ? new ArrayDeque<>() : cola;
            descartarVencidos(actual, ahora);
            if (actual.size() < maximo) {
                actual.addLast(ahora);
                permitido[0] = true;
            }
            return actual;
        });
        return permitido[0];
    }

    /** Registra siempre el evento (por ejemplo, un fallo) y devuelve cuantos hay en la ventana. */
    public int registrar(String clave) {
        long ahora = reloj.getAsLong();
        int[] total = {0};
        eventos.compute(clave, (k, cola) -> {
            ArrayDeque<Long> actual = cola == null ? new ArrayDeque<>() : cola;
            descartarVencidos(actual, ahora);
            actual.addLast(ahora);
            total[0] = actual.size();
            return actual;
        });
        return total[0];
    }

    /** Eventos vigentes en la ventana, sin registrar ninguno. */
    public int cantidad(String clave) {
        long ahora = reloj.getAsLong();
        int[] total = {0};
        eventos.computeIfPresent(clave, (k, cola) -> {
            descartarVencidos(cola, ahora);
            total[0] = cola.size();
            return cola.isEmpty() ? null : cola;
        });
        return total[0];
    }

    public void reiniciar(String clave) {
        eventos.remove(clave);
    }

    /** Elimina las claves sin eventos vigentes (llamar periodicamente). */
    public void purgar() {
        long ahora = reloj.getAsLong();
        for (String clave : eventos.keySet()) {
            eventos.computeIfPresent(clave, (k, cola) -> {
                descartarVencidos(cola, ahora);
                return cola.isEmpty() ? null : cola;
            });
        }
    }

    private void descartarVencidos(ArrayDeque<Long> cola, long ahora) {
        while (!cola.isEmpty() && ahora - cola.peekFirst() >= ventanaNanos) {
            cola.pollFirst();
        }
    }
}
