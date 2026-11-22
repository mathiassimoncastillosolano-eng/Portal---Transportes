package com.transportes.postergacion.servicios;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.dto.CotizacionCambioDto;
import com.transportes.postergacion.dto.ElegibilidadCambioDto;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.reglas.ComparacionTarifaCambio;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;

/**
 * Cambio de viajes desde el Sistema Empresarial: el personal de agencia cambia el pasaje de un cliente.
 * A diferencia del Portal, el pasaje se busca por su id porque el agente no es el dueño de la compra.
 * Las reglas (pasaje vigente y 6 h de anticipación) son las mismas de PostergacionServicio.
 */
@Service
public class CambioViajeAgenciaServicio {

    private final CompraRepositorio compras;
    private final PostergacionServicio postergaciones;
    private final ViajeAsientoRepositorio asientos;

    public CambioViajeAgenciaServicio(CompraRepositorio compras, PostergacionServicio postergaciones,
                                      ViajeAsientoRepositorio asientos) {
        this.compras = compras;
        this.postergaciones = postergaciones;
        this.asientos = asientos;
    }

    // No lanza error si no se puede: responde elegible = false con el motivo.
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

    @Transactional(readOnly = true)
    public ConsultaPostergacionDto consultarViajes(int idPasaje, String origen, String destino, LocalDate fecha) {
        FilaCompra pasaje = buscarPasaje(idPasaje);
        postergaciones.exigirCambiable(pasaje);
        return postergaciones.listarViajesSinElOriginal(pasaje, origen, destino, fecha);
    }

    @Transactional(readOnly = true)
    public CotizacionCambioDto cotizar(int idPasaje, long idViajeNuevo, int idAsiento) {
        FilaCompra pasaje = buscarPasaje(idPasaje);
        postergaciones.exigirCambiable(pasaje);
        if (Objects.equals(pasaje.idViaje(), idViajeNuevo)) {
            throw new PostergacionRechazadaException(PostergacionRechazadaException.MISMO_VIAJE,
                    "Elija un viaje distinto al original.");
        }
        ViajeAsiento asientoNuevo = buscarAsiento(idViajeNuevo, idAsiento);

        BigDecimal importePagado = ComparacionTarifaCambio.importePagado(pasaje.precioPasaje(), pasaje.adicionalPagado());
        ComparacionTarifaCambio.Resultado resultado =
                ComparacionTarifaCambio.comparar(importePagado, asientoNuevo.getPrecio());
        return CotizacionCambioDto.desde(resultado);
    }

    private FilaCompra buscarPasaje(int idPasaje) {
        return compras.filaDelPasaje(idPasaje)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No encontramos este pasaje."));
    }

    private ViajeAsiento buscarAsiento(long idViaje, int idAsiento) {
        return asientos.findByIdViajeAndIdAsiento(Math.toIntExact(idViaje), idAsiento)
                .orElseThrow(() -> new PostergacionRechazadaException(
                        PostergacionRechazadaException.ASIENTO_NO_DISPONIBLE,
                        "El asiento elegido no existe en ese viaje."));
    }
}
