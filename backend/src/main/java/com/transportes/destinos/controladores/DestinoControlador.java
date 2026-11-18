package com.transportes.destinos.controladores;

import com.transportes.destinos.dto.DestinoRespuestaDTO;
import com.transportes.destinos.servicios.DestinoServicio;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Recibe las peticiones de la sección Destinos. */
@RestController
@RequestMapping("/api/destinos")
@CrossOrigin(origins = "http://localhost:5173")
public class DestinoControlador {

    private final DestinoServicio destinoServicio;

    public DestinoControlador(DestinoServicio destinoServicio) {
        this.destinoServicio = destinoServicio;
    }

    /** Devuelve los destinos activos. */
    @GetMapping
    public List<DestinoRespuestaDTO> obtenerDestinos() {
        return destinoServicio.obtenerDestinosActivos();
    }
}
