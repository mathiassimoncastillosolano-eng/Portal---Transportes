package com.transportes.salud.controladores;

import com.transportes.salud.dto.EstadoSalud;
import com.transportes.salud.servicios.DisponibilidadServicio;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health checks públicos de RutaLibre.
 *
 * <ul>
 * <li>{@code GET /api/health/live}: el proceso responde. No toca la base de datos.</li>
 * <li>{@code GET /api/health/ready}: la aplicación terminó de arrancar y PostgreSQL responde.
 * Lo usan el Health Check de Render y la pantalla de inicialización del frontend.</li>
 * </ul>
 *
 * <p>Las respuestas nunca se cachean: un proxy o el navegador no deben servir un READY viejo.</p>
 */
@RestController
@RequestMapping("/api/health")
public class SaludControlador {

    private static final EstadoSalud VIVO = EstadoSalud.de("UP");

    private final DisponibilidadServicio disponibilidadServicio;

    public SaludControlador(DisponibilidadServicio disponibilidadServicio) {
        this.disponibilidadServicio = disponibilidadServicio;
    }

    @GetMapping("/live")
    public ResponseEntity<EstadoSalud> live() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(VIVO);
    }

    @GetMapping("/ready")
    public ResponseEntity<EstadoSalud> ready() {
        DisponibilidadServicio.Resultado resultado = disponibilidadServicio.evaluar();
        return ResponseEntity.status(resultado.codigo())
                .cacheControl(CacheControl.noStore())
                .body(resultado.cuerpo());
    }
}
