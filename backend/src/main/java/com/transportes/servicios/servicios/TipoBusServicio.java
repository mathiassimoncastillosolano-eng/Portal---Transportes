package com.transportes.servicios.servicios;

import com.transportes.servicios.dto.TipoBusRespuestaDTO;
import com.transportes.servicios.repositorios.TipoBusRepositorio;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Contiene la lógica de negocio necesaria para obtener los tipos de
 * bus que se muestran como tarjetas de servicio en el frontend, a
 * partir de los registros existentes en la base de datos.
 */
@Service
public class TipoBusServicio {

    private final TipoBusRepositorio tipoBusRepositorio;

    public TipoBusServicio(TipoBusRepositorio tipoBusRepositorio) {
        this.tipoBusRepositorio = tipoBusRepositorio;
    }

    /**
     * Devuelve todos los tipos de bus registrados, convertidos al DTO
     * que necesita la tarjeta de servicio del frontend. Si no existen
     * tipos de bus en la base de datos, se devuelve una lista vacía.
     */
    public List<TipoBusRespuestaDTO> obtenerTiposBus() {
        return tipoBusRepositorio.findAllByOrderByIdTipoBusAsc()
                .stream()
                .map(tipoBus -> new TipoBusRespuestaDTO(
                        tipoBus.getIdTipoBus(),
                        tipoBus.getNombreTipo(),
                        tipoBus.getDescripcion(),
                        tipoBus.getUrlImagen(),
                        tipoBus.getDescripcionReclinacion()
                ))
                .toList();
    }
}
