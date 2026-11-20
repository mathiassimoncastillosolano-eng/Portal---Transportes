package com.transportes.pasajes.controladores;

import com.transportes.pasajes.dto.OpcionesFiltroPasajesDto;
import com.transportes.pasajes.dto.PaginaPasajesDto;
import com.transportes.pasajes.servicios.PasajesServicio;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pasajes")
public class PasajesControlador {

    private final PasajesServicio servicio;

    public PasajesControlador(PasajesServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public PaginaPasajesDto listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer idPasajero,
            @RequestParam(required = false) String origen,
            @RequestParam(required = false) String destino,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String fase,
            @RequestParam(required = false) String orden,
            @RequestParam(required = false) String direccion,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "12") int tamano) {
        return servicio.listar(q, idPasajero, origen, destino, desde, hasta, estado, fase, orden, direccion, pagina,
                tamano);
    }

    @GetMapping("/opciones")
    public OpcionesFiltroPasajesDto opciones() {
        return servicio.opciones();
    }
}
