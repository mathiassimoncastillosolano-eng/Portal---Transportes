package com.transportes.viajes.controladores;

import com.transportes.viajes.dto.ViajeResumenDto;
import com.transportes.viajes.servicios.ViajeService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

/** Recibe las peticiones de búsqueda de viajes. */
@RestController
@RequestMapping("/api/viajes")
public class ViajeController {
    private final ViajeService viajes;
    public ViajeController(ViajeService viajes) { this.viajes = viajes; }

    /** Busca viajes por origen, destino y fecha. */
    @GetMapping("/buscar")
    public List<ViajeResumenDto> buscar(@RequestParam String origen, @RequestParam String destino,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(defaultValue = "cualquiera") String horario,
            @RequestParam(required = false) String franjas) {
        if (franjas != null) {
            return viajes.buscarPorFranjas(origen, destino, fecha, franjas);
        }
        return viajes.buscar(origen, destino, fecha, horario);
    }
}
