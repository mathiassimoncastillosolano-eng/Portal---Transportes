package com.transportes.servicios.servicios;

import com.transportes.servicios.dto.TipoBusRespuestaDTO;
import com.transportes.servicios.repositorios.TipoBusRepositorio;
import org.springframework.stereotype.Service;

import java.util.List;

/** Lógica de la sección Servicios: lee los tipos de bus y los convierte en tarjetas. */
@Service
public class TipoBusServicio {

    private final TipoBusRepositorio tipoBusRepositorio;

    public TipoBusServicio(TipoBusRepositorio tipoBusRepositorio) {
        this.tipoBusRepositorio = tipoBusRepositorio;
    }

    /** Tipos de bus convertidos a TipoBusRespuestaDTO. Si no hay ninguno, devuelve una lista vacía. */
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
