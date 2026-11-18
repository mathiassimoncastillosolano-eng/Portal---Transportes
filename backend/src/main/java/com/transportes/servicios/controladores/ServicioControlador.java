package com.transportes.servicios.controladores;

import com.transportes.servicios.dto.TipoBusRespuestaDTO;
import com.transportes.servicios.servicios.TipoBusServicio;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Recibe las peticiones de la sección Servicios (tipos de bus). */
@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "http://localhost:5173")
public class ServicioControlador {

    private final TipoBusServicio tipoBusServicio;

    public ServicioControlador(TipoBusServicio tipoBusServicio) {
        this.tipoBusServicio = tipoBusServicio;
    }

    /** GET: tipos de bus con lo que necesita cada tarjeta (id, nombre, descripción, imagen y reclinación). */
    @GetMapping
    public List<TipoBusRespuestaDTO> obtenerServicios() {
        return tipoBusServicio.obtenerTiposBus();
    }
}
