package com.transportes.viajes.controladores;

import com.transportes.viajes.dto.ViajeResumenDto;
import com.transportes.viajes.servicios.ViajeService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/viajes")
public class ViajeController {
    private final ViajeService viajes;
    public ViajeController(ViajeService viajes) { this.viajes = viajes; }

    @GetMapping("/buscar")
    public List<ViajeResumenDto> buscar(@RequestParam String origen, @RequestParam String destino,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(defaultValue = "cualquiera") String horario) {
        return viajes.buscar(origen, destino, fecha, horario);
    }
}
