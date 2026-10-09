package com.transportes.viajes.servicios;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.transportes.viajes.dto.PasajeroAsientoRequest;

/**
 * Caché EN MEMORIA de los pasajeros ya validados en "Continuar al pago", por sesión de reserva.
 * No toca la base de datos: los datos solo pasan a PostgreSQL cuando el pago se confirma
 * ({@link PasajerosSesionServicio#confirmarCompra}). Cada entrada vence con la sesión y se descarta sola.
 * Como la denylist de tokens, se pierde al reiniciar el servidor (el usuario vuelve a continuar al pago).
 */
@Component
public class PasajerosSesionCache {

    private record Entrada(LocalDateTime expira, List<PasajeroAsientoRequest> pasajeros) {
    }

    private final Map<String, Entrada> porSesion = new ConcurrentHashMap<>();

    /** Reemplaza lo guardado para la sesión (vence cuando vence la sesión). */
    public void guardar(String idSesion, LocalDateTime expira, List<PasajeroAsientoRequest> pasajeros) {
        porSesion.put(idSesion, new Entrada(expira, List.copyOf(pasajeros)));
    }

    public Optional<List<PasajeroAsientoRequest>> obtener(String idSesion) {
        Entrada entrada = porSesion.get(idSesion);
        if (entrada == null) {
            return Optional.empty();
        }
        if (entrada.expira().isBefore(LocalDateTime.now())) {
            porSesion.remove(idSesion);
            return Optional.empty();
        }
        return Optional.of(entrada.pasajeros());
    }

    public void eliminar(String idSesion) {
        porSesion.remove(idSesion);
    }

    @Scheduled(fixedDelay = 60_000L, initialDelay = 60_000L)
    void purgarVencidos() {
        LocalDateTime ahora = LocalDateTime.now();
        porSesion.entrySet().removeIf(e -> e.getValue().expira().isBefore(ahora));
    }
}
