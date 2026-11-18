package com.transportes.salud.controladores;

import com.transportes.salud.dto.EstadoSalud;
import com.transportes.salud.servicios.DisponibilidadServicio;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Recibe las consultas que revisan si el backend está funcionando. */
@RestController
@RequestMapping("/api/health")
public class SaludControlador {

    private static final EstadoSalud VIVO = EstadoSalud.de("UP");

    private final DisponibilidadServicio disponibilidadServicio;

    public SaludControlador(DisponibilidadServicio disponibilidadServicio) {
        this.disponibilidadServicio = disponibilidadServicio;
    }

    /** Responde 200 si el backend está encendido. */
    @GetMapping("/live")
    public ResponseEntity<EstadoSalud> live() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(VIVO);
    }

    /** Responde si el backend y la base de datos están listos. */
    @GetMapping("/ready")
    public ResponseEntity<EstadoSalud> ready() {
        DisponibilidadServicio.Resultado resultado = disponibilidadServicio.evaluar();
        return ResponseEntity.status(resultado.codigo())
                .cacheControl(CacheControl.noStore())
                .body(resultado.cuerpo());
    }
}
