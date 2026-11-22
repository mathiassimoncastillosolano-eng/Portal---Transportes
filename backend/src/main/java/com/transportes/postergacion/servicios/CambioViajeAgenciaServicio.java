package com.transportes.postergacion.servicios;

import java.time.LocalDate;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.dto.ElegibilidadCambioDto;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;

/**
 * Cambio de viajes desde el Sistema Empresarial: el personal de agencia cambia el pasaje de un cliente.
 * Diferencia con el Portal: el pasaje se busca por su id (el agente no es el dueño de la compra).
 * Las reglas (pasaje vigente y 6 h de anticipación) son las mismas y se reutilizan de PostergacionServicio.
 */
@Service
public class CambioViajeAgenciaServicio {

    private final CompraRepositorio compras;
    private final PostergacionServicio postergaciones;

    public CambioViajeAgenciaServicio(CompraRepositorio compras, PostergacionServicio postergaciones) {
        this.compras = compras;
        this.postergaciones = postergaciones;
    }

    /** Dice si el pasaje se puede cambiar; si no, devuelve el código y el motivo (no lanza error). */
    @Transactional(readOnly = true)
    public ElegibilidadCambioDto consultarElegibilidad(int idPasaje) {
        FilaCompra pasaje = buscarPasaje(idPasaje);
        try {
            postergaciones.exigirCambiable(pasaje);
            return ElegibilidadCambioDto.aceptada();
        } catch (PostergacionRechazadaException rechazo) {
            return ElegibilidadCambioDto.rechazada(rechazo.getCodigo(), rechazo.getReason());
        }
    }

    /** Viajes a los que se puede cambiar el pasaje (ruta y fecha elegidas), sin el viaje original. */
    @Transactional(readOnly = true)
    public ConsultaPostergacionDto consultarViajes(int idPasaje, String origen, String destino, LocalDate fecha) {
        FilaCompra pasaje = buscarPasaje(idPasaje);
        postergaciones.exigirCambiable(pasaje);
        return postergaciones.listarViajesSinElOriginal(pasaje, origen, destino, fecha);
    }

    /** Busca el pasaje por su id. Si no existe responde 404. */
    private FilaCompra buscarPasaje(int idPasaje) {
        return compras.filaDelPasaje(idPasaje)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No encontramos este pasaje."));
    }
}
