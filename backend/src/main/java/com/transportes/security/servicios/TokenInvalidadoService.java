package com.transportes.security.servicios;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Logout con JWT. Un JWT sigue siendo válido hasta que vence, aunque el navegador lo borre. Para poder cerrarlo
 * antes se usa una lista negra en memoria con el jti de cada token cerrado:
 * al hacer logout, su jti entra a la lista hasta su vencimiento;
 * el filtro rechaza cualquier token que esté en la lista;
 * una tarea programada borra los que ya vencieron.
 * Limitación: si el servidor se reinicia la lista se pierde. Se acepta porque los tokens duran poco; el siguiente
 * paso sería guardarla en una tabla o en Redis.
 */
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
