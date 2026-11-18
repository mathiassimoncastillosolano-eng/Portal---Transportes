package com.transportes.buses.controladores;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.buses.dto.AsientoFisicoDTO;
import com.transportes.buses.servicios.AsientoServicio;

/**
 * Controlador REST de los asientos físicos de un bus (/api/buses). Es público: no pide token porque solo muestra
 * la forma del bus, no datos de nadie.
 */
@RestController
@RequestMapping("/api/buses")
@CrossOrigin(origins = "http://localhost:5173")
public class AsientoControlador {

    private final AsientoServicio asientoServicio;

    public AsientoControlador(AsientoServicio asientoServicio) {
        this.asientoServicio = asientoServicio;
    }

    /**
     * GET /api/buses/{idBus}/asientos: devuelve todos los asientos del bus (fila, letra, lado y piso) para dibujar
     * el mapa.
     */
    @GetMapping("/{idBus}/asientos")
    public ResponseEntity<List<AsientoFisicoDTO>> obtenerAsientosPorBus(@PathVariable Integer idBus) {
        return ResponseEntity.ok(asientoServicio.listarAsientosPorBus(idBus));
    }
}