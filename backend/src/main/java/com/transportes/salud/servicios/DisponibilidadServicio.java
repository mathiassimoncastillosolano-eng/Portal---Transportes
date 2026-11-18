package com.transportes.salud.servicios;

import com.transportes.salud.dto.EstadoSalud;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Decide si el backend está listo para atender. Junta dos señales: que Spring terminó de arrancar y que PostgreSQL
 * responde.
 * DEGRADED existe porque Render reinicia la instancia si /ready falla seguido; si la base se cae un rato,
 * reiniciar no ayuda. Por eso, si ya estuvo lista antes, una caída de la base se informa como 200 DEGRADED (Render
 * no reinicia, pero el frontend espera READY). Antes del primer READY se responde 503 NOT_READY.
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

    /** Devuelve READY, DEGRADED o NOT_READY según el arranque y la base. */
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
