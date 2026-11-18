package com.transportes.destinos.servicios;

import com.transportes.destinos.dto.DestinoRespuestaDTO;
import com.transportes.destinos.repositorios.UbicacionRepositorio;
import org.springframework.stereotype.Service;

import java.util.List;

/** Lógica de la sección Destinos: lee las ubicaciones activas y las convierte en tarjetas. */
@Service
public class DestinoServicio {

    private final UbicacionRepositorio ubicacionRepositorio;

    public DestinoServicio(UbicacionRepositorio ubicacionRepositorio) {
        this.ubicacionRepositorio = ubicacionRepositorio;
    }

    /** Ubicaciones activas convertidas a DestinoRespuestaDTO. Si no hay ninguna, devuelve una lista vacía. */
    public List<DestinoRespuestaDTO> obtenerDestinosActivos() {
        return ubicacionRepositorio.findByActivaTrueOrderByNombreAsc()
                .stream()
                .map(ubicacion -> new DestinoRespuestaDTO(
                        ubicacion.getIdUbicacion(),
                        ubicacion.getNombre(),
                        ubicacion.getUrlImagen()
                ))
                .toList();
    }
}
