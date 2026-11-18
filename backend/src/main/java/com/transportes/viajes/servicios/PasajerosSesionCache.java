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
 * Guarda EN MEMORIA los pasajeros ya validados en "Continuar al pago", por sesión de reserva. No toca la base: los
 * datos pasan a PostgreSQL solo cuando el pago se aprueba. Cada entrada vence con la sesión. Si el servidor se
 * reinicia se pierde (el usuario vuelve a continuar al pago).
 */
@Component
public class PasajerosSesionCache {

    private record Entrada(LocalDateTime expira, List<PasajeroAsientoRequest> pasajeros) {
    }

    private final Map<String, Entrada> porSesion = new ConcurrentHashMap<>();

    /** Guarda (o reemplaza) los pasajeros de la sesión hasta que la sesión venza. */
    public void guardar(String idSesion, LocalDateTime expira, List<PasajeroAsientoRequest> pasajeros) {
        porSesion.put(idSesion, new Entrada(expira, List.copyOf(pasajeros)));
    }

    /** Pasajeros guardados de la sesión, si no vencieron. */
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

    /** Borra los pasajeros de la sesión (al aprobar el pago o al salir). */
    public void eliminar(String idSesion) {
        porSesion.remove(idSesion);
    }

    @Scheduled(fixedDelay = 60_000L, initialDelay = 60_000L)
    void purgarVencidos() {
        LocalDateTime ahora = LocalDateTime.now();
        porSesion.entrySet().removeIf(e -> e.getValue().expira().isBefore(ahora));
    }
}
