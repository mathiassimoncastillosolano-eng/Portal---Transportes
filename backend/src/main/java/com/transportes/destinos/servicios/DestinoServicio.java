package com.transportes.destinos.servicios;

import com.transportes.destinos.dto.DestinoRespuestaDTO;
import com.transportes.destinos.repositorios.UbicacionRepositorio;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Contiene la lógica de negocio necesaria para obtener los destinos que
 * se muestran en el frontend, a partir de las ubicaciones activas
 * registradas en la base de datos.
 */
@Service
public class DestinoServicio {

    private final UbicacionRepositorio ubicacionRepositorio;

    public DestinoServicio(UbicacionRepositorio ubicacionRepositorio) {
        this.ubicacionRepositorio = ubicacionRepositorio;
    }

    /**
     * Devuelve los destinos activos, convertidos al DTO que necesita la
     * tarjeta de destino del frontend. Si no existen ubicaciones activas
     * en la base de datos, se devuelve una lista vacía.
     */
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
