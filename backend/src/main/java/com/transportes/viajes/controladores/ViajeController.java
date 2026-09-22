package com.transportes.viajes.controladores;

import com.transportes.viajes.dto.TipoBusDTO;
import com.transportes.viajes.dto.ViajeResultadoDTO;
import com.transportes.viajes.servicios.ViajeService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/viajes")
@CrossOrigin(origins = "http://localhost:5173")
public class ViajeController {

    private final ViajeService viajeService;

    public ViajeController(ViajeService viajeService) {
        this.viajeService = viajeService;
    }

    /**
     * Filtra viajes por tipo de servicio (tipo_bus.nombre_tipo).
     * El parámetro es repetible para seleccionar varios tipos a la vez
     * (OR) y opcional: sin parámetro devuelve todos los viajes ("Todos").
     */
    @GetMapping("/tipo-servicio")
    public List<ViajeResultadoDTO> buscarPorTipoServicio(
            @RequestParam(required = false) List<String> tipoServicio) {

        return viajeService.buscarPorTipoServicio(tipoServicio);
    }

    /**
     * Lista los tipos de bus existentes en la BD, para que el frontend
     * construya dinámicamente los chips de filtro ("Todos" + uno por
     * cada nombre_tipo).
     */
    @GetMapping("/tipos-bus")
    public List<TipoBusDTO> listarTiposDeBus() {
        return viajeService.listarTiposDeBus();
    }
}
