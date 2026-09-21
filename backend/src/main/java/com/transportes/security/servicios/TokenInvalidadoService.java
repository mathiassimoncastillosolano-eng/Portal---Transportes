package com.transportes.security.servicios;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mecanismo de cierre de sesion para JWT.
 *
 * <p><b>Decision de diseno (documentada tambien en
 * DOCUMENTACION_CAMBIOS_AUTENTICACION.docx):</b> un JWT es, por naturaleza,
 * stateless: el backend no guarda sesiones y cualquier token firmado
 * correctamente se considera valido hasta que expira. Eliminar el token en
 * el frontend evita que el propio navegador lo reenvie, pero no evita que
 * alguien que ya copio ese token lo siga usando.</p>
 *
 * <p>Para un proyecto de este tamano, la solucion mas simple y apropiada es
 * una <b>lista de tokens invalidados (denylist) en memoria</b>, indexada por
 * el identificador unico del token ({@code jti}):</p>
 * <ul>
 *     <li>Al cerrar sesion, el {@code jti} del token actual se agrega a la
 *         lista junto con su fecha de expiracion.</li>
 *     <li>El filtro de autenticacion rechaza cualquier token cuyo
 *         {@code jti} este en la lista, aunque su firma siga siendo
 *         valida.</li>
 *     <li>Una tarea programada limpia periodicamente las entradas ya
 *         expiradas, para que la lista no crezca indefinidamente.</li>
 * </ul>
 *
 * <p><b>Limitacion conocida:</b> al vivir en memoria, esta lista se pierde
 * si la aplicacion se reinicia (los tokens emitidos antes del reinicio
 * volverian a considerarse validos hasta su expiracion natural). Dado que
 * los tokens tienen una duracion corta (ver
 * {@code security.jwt.expiracion-minutos}) y que este es un entorno de
 * estudio/practica, se considera una limitacion aceptable. Si el proyecto
 * creciera, el siguiente paso natural seria mover esta lista a una tabla en
 * PostgreSQL o a Redis.</p>
 */
@Service
public class TokenInvalidadoService {

    private final Map<String, Instant> tokensInvalidados = new ConcurrentHashMap<>();

    public void invalidar(String jti, Instant expiracion) {
        if (jti != null) {
            tokensInvalidados.put(jti, expiracion);
        }
    }

    public boolean estaInvalidado(String jti) {
        return jti != null && tokensInvalidados.containsKey(jti);
    }

    /**
     * Elimina cada 30 minutos las entradas de tokens que ya expiraron por
     * si mismos, ya que dejan de ser necesarias en la lista.
     */
    @Scheduled(fixedRate = 30, timeUnit = java.util.concurrent.TimeUnit.MINUTES)
    public void limpiarTokensExpirados() {
        Instant ahora = Instant.now();
        tokensInvalidados.entrySet().removeIf(entrada -> entrada.getValue().isBefore(ahora));
    }
}
