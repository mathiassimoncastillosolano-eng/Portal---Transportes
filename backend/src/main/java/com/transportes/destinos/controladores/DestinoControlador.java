package com.transportes.destinos.controladores;

import com.transportes.destinos.dto.DestinoRespuestaDTO;
import com.transportes.destinos.servicios.DestinoServicio;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Expone el endpoint utilizado por la sección de Destinos del frontend
 * para consultar los destinos disponibles en la base de datos real.
 */
@RestController
@RequestMapping("/api/destinos")
@CrossOrigin(origins = "http://localhost:5173")
public class DestinoControlador {

    private final DestinoServicio destinoServicio;

    public DestinoControlador(DestinoServicio destinoServicio) {
        this.destinoServicio = destinoServicio;
    }

    /**
     * Devuelve la lista de destinos activos registrados en la base de
     * datos, con la información mínima que necesitan las tarjetas de
     * destino del frontend (id, ciudad e imagen).
     */
    @GetMapping
    public List<DestinoRespuestaDTO> obtenerDestinos() {
        return destinoServicio.obtenerDestinosActivos();
    }
}
