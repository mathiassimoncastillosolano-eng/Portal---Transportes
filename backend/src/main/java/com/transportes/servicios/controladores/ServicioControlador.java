package com.transportes.servicios.controladores;

import com.transportes.servicios.dto.TipoBusRespuestaDTO;
import com.transportes.servicios.servicios.TipoBusServicio;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Expone el endpoint utilizado por la sección de Servicios del
 * frontend para consultar los tipos de bus disponibles en la base de
 * datos real.
 */
@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "http://localhost:5173")
public class ServicioControlador {

    private final TipoBusServicio tipoBusServicio;

    public ServicioControlador(TipoBusServicio tipoBusServicio) {
        this.tipoBusServicio = tipoBusServicio;
    }

    /**
     * Devuelve la lista de tipos de bus registrados en la base de
     * datos, con la información mínima que necesitan las tarjetas de
     * servicio del frontend (id, nombre, descripción, imagen y
     * reclinación).
     */
    @GetMapping
    public List<TipoBusRespuestaDTO> obtenerServicios() {
        return tipoBusServicio.obtenerTiposBus();
    }
}
