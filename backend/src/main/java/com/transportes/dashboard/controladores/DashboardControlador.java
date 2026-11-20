package com.transportes.dashboard.controladores;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.dashboard.dto.DashboardDto;
import com.transportes.dashboard.dto.OpcionesDashboardDto;
import com.transportes.dashboard.servicios.DashboardServicio;

/**
 * Dashboard del gerente en el Sistema Empresarial. Solo el rol GERENTE puede usarlo
 * (regla en ConfiguracionSeguridad).
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardControlador {

    private final DashboardServicio servicio;

    public DashboardControlador(DashboardServicio servicio) {
        this.servicio = servicio;
    }

    /**
     * GET /api/dashboard?desde=2026-11-01&hasta=2026-11-20 (fechas inclusivas).
     * Filtros opcionales: entorno (SANDBOX o PRODUCTION, por defecto PRODUCTION), agencia (id de la ciudad de
     * salida, como lo entrega /opciones), servicio (id del tipo de bus) y destino (nombre de la ciudad).
     */
    @GetMapping
    public DashboardDto obtener(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String entorno,
            @RequestParam(required = false) Long agencia,
            @RequestParam(required = false) Long servicio,
            @RequestParam(required = false) String destino) {
        return this.servicio.obtener(desde, hasta, entorno, agencia, servicio, destino);
    }

    /** GET /api/dashboard/opciones: agencias, tipos de bus, destinos y la fecha de hoy para los filtros. */
    @GetMapping("/opciones")
    public OpcionesDashboardDto opciones() {
        return servicio.opciones();
    }
}
