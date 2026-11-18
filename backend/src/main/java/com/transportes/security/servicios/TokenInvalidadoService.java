package com.transportes.security.servicios;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Guarda en memoria los tokens cerrados con logout para que no se puedan volver a usar. */
@Service
public class TokenInvalidadoService {

    private final Map<String, Instant> tokensInvalidados = new ConcurrentHashMap<>();

    /** Logout: agrega el jti a la lista hasta que el token habría vencido. */
    public void invalidar(String jti, Instant expiracion) {
        if (jti != null) {
            tokensInvalidados.put(jti, expiracion);
        }
    }

    /** true si este token ya se cerró con logout. */
    public boolean estaInvalidado(String jti) {
        return jti != null && tokensInvalidados.containsKey(jti);
    }

    /** Cada 30 minutos borra de la lista los tokens que ya vencieron solos. */
    @Scheduled(fixedRate = 30, timeUnit = java.util.concurrent.TimeUnit.MINUTES)
    public void limpiarTokensExpirados() {
        Instant ahora = Instant.now();
        tokensInvalidados.entrySet().removeIf(entrada -> entrada.getValue().isBefore(ahora));
    }
}
