package com.transportes.salud.servicios;

import com.transportes.salud.dto.EstadoSalud;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Decide si RutaLibre está preparada para atender solicitudes reales.
 *
 * <p>Combina dos señales:</p>
 * <ol>
 * <li>El estado de readiness de Spring Boot ({@link ApplicationAvailability}): pasa a
 * ACCEPTING_TRAFFIC solo cuando el contexto terminó de arrancar (y vuelve a REFUSING_TRAFFIC
 * durante un apagado ordenado).</li>
 * <li>La conectividad con PostgreSQL ({@link VerificadorBaseDatos}).</li>
 * </ol>
 *
 * <p><b>Por qué existe DEGRADED.</b> Render usa este mismo endpoint como Health Check y reinicia
 * una instancia que lo falla de forma continuada. Si Supabase sufre un corte transitorio, reiniciar
 * no lo arregla y, como Hibernate valida el esquema al arrancar ({@code ddl-auto=validate}), la
 * instancia ni siquiera podría volver a levantar mientras dure el corte. Por eso, una vez que la
 * instancia estuvo lista al menos una vez, un fallo de la base se informa como {@code 200 DEGRADED}:
 * Render no reinicia, pero el frontend sigue sin confirmar disponibilidad (solo acepta READY).
 * Antes de la primera confirmación el fallo es {@code 503 NOT_READY}, así un despliegue nuevo no
 * recibe tráfico hasta que la base responde. Se puede desactivar con
 * {@code salud.readiness.tolerar-caidas-bd=false}.</p>
 */
@Service
public class DisponibilidadServicio {

    public record Resultado(HttpStatus codigo, EstadoSalud cuerpo) {
    }

    private final ApplicationAvailability disponibilidad;
    private final VerificadorBaseDatos verificadorBaseDatos;
    private final boolean tolerarCaidasBd;
    private volatile boolean estuvoListo;

    public DisponibilidadServicio(ApplicationAvailability disponibilidad,
            VerificadorBaseDatos verificadorBaseDatos,
            @Value("${salud.readiness.tolerar-caidas-bd:true}") boolean tolerarCaidasBd) {
        this.disponibilidad = disponibilidad;
        this.verificadorBaseDatos = verificadorBaseDatos;
        this.tolerarCaidasBd = tolerarCaidasBd;
    }

    public Resultado evaluar() {
        if (disponibilidad.getReadinessState() != ReadinessState.ACCEPTING_TRAFFIC) {
            return noListo(estuvoListo ? "DETENIENDO" : "INICIANDO");
        }

        if (verificadorBaseDatos.disponible()) {
            estuvoListo = true;
            return new Resultado(HttpStatus.OK, EstadoSalud.de("READY"));
        }

        if (estuvoListo && tolerarCaidasBd) {
            return new Resultado(HttpStatus.OK, new EstadoSalud("DEGRADED", "DEPENDENCIAS"));
        }
        return noListo("DEPENDENCIAS");
    }

    private static Resultado noListo(String fase) {
        return new Resultado(HttpStatus.SERVICE_UNAVAILABLE, new EstadoSalud("NOT_READY", fase));
    }
}
