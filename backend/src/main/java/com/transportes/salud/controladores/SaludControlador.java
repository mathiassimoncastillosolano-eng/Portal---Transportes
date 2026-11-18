package com.transportes.salud.controladores;

import com.transportes.salud.dto.EstadoSalud;
import com.transportes.salud.servicios.DisponibilidadServicio;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST de salud del backend (públicos, sin caché):
 * GET /api/health/live: el proceso responde (no toca la base).
 * GET /api/health/ready: arrancó y PostgreSQL responde. Lo usan Render y la pantalla de carga del frontend.
 */
@RestController
@RequestMapping("/api/health")
public class SaludControlador {

    private static final EstadoSalud VIVO = EstadoSalud.de("UP");

    private final DisponibilidadServicio disponibilidadServicio;

    public SaludControlador(DisponibilidadServicio disponibilidadServicio) {
        this.disponibilidadServicio = disponibilidadServicio;
    }

    /** GET /live: siempre 200 si el proceso responde. */
    @GetMapping("/live")
    public ResponseEntity<EstadoSalud> live() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(VIVO);
    }

    /** GET /ready: revisa la base de datos; 503 si todavía no está lista. */
    @GetMapping("/ready")
    public ResponseEntity<EstadoSalud> ready() {
        DisponibilidadServicio.Resultado resultado = disponibilidadServicio.evaluar();
        return ResponseEntity.status(resultado.codigo())
                .cacheControl(CacheControl.noStore())
                .body(resultado.cuerpo());
    }
}
