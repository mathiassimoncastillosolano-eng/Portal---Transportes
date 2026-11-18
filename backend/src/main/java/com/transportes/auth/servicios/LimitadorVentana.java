package com.transportes.auth.servicios;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/** Cuenta intentos por IP o correo en un tiempo dado, para frenar abusos. */
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

    /** Si todavía cabe en la ventana, lo registra y devuelve true; si no, devuelve false. */
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

    /** Registra un intento y devuelve cuántos hay en el tiempo de control. */
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

    /** Cuántos eventos hay en la ventana, sin registrar ninguno. */
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

    /** Borra los intentos guardados de una clave. */
    public void reiniciar(String clave) {
        eventos.remove(clave);
    }

    /** Quita de memoria las claves que ya no tienen eventos (se llama cada cierto tiempo). */
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
