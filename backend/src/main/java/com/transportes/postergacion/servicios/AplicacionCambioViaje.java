package com.transportes.postergacion.servicios;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Objects;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.pagos.entidades.Pasaje;
import com.transportes.pagos.repositorios.PasajeRepositorio;
import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.entidades.Postergacion;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.repositorios.PostergacionRepositorio;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.eventos.AsientoCambiadoEvento;
import com.transportes.viajes.excepciones.ReservaNoPermitidaException;
import com.transportes.viajes.excepciones.ViajeNoEncontradoException;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.ValidadorReservaViaje;

import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.ASIENTO_NO_DISPONIBLE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.CAMBIO_NO_APLICADO;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.MISMO_VIAJE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.VIAJE_NO_RESERVABLE;

/**
 * Aplica el cambio de viaje hecho por el personal de agencia. Sigue los mismos pasos que la confirmación
 * del Portal y usa las mismas consultas, pero guarda qué agente hizo el cambio.
 * Debe llamarse dentro de una transacción: si un paso falla, se deshace todo y el pasaje queda como estaba.
 */
@Component
public class AplicacionCambioViaje {

    private static final String ASIENTO_TOMADO =
            "El asiento elegido ya no está disponible (pudo venderse desde el Portal o en otra agencia). "
            + "El pasaje no fue modificado; elija otro asiento.";

    private final PasajeRepositorio pasajes;
    private final ViajeAsientoRepositorio asientos;
    private final PostergacionRepositorio historial;
    private final CompraRepositorio compras;
    private final ValidadorReservaViaje validadorReserva;
    private final ApplicationEventPublisher publicador;
    private final Clock reloj;

    public AplicacionCambioViaje(PasajeRepositorio pasajes, ViajeAsientoRepositorio asientos,
                                 PostergacionRepositorio historial, CompraRepositorio compras,
                                 ValidadorReservaViaje validadorReserva, ApplicationEventPublisher publicador,
                                 Clock relojNegocio) {
        this.pasajes = pasajes;
        this.asientos = asientos;
        this.historial = historial;
        this.compras = compras;
        this.validadorReserva = validadorReserva;
        this.publicador = publicador;
        this.reloj = relojNegocio;
    }

    @Transactional
    public ConfirmacionPostergacionDto aplicar(FilaCompra antes, long idViajeNuevo, int idAsiento, String idSesion,
                                               BigDecimal importeAdicional, String referenciaPago, int idEmpleado) {
        int idPasaje = antes.idPasaje();
        Pasaje pasaje = pasajes.findById(idPasaje)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No encontramos este pasaje."));
        ViajeAsiento original = asientos.findById(pasaje.getIdViajeAsiento())
                .orElseThrow(() -> rechazo(CAMBIO_NO_APLICADO,
                        "No se pudo leer el asiento actual del pasaje. No se hizo ningún cambio."));
        ViajeAsiento nuevo = asientos.findByIdViajeAndIdAsiento(Math.toIntExact(idViajeNuevo), idAsiento)
                .orElseThrow(() -> rechazo(ASIENTO_NO_DISPONIBLE, ASIENTO_TOMADO));

        if (Objects.equals(nuevo.getIdViaje(), original.getIdViaje())) {
            throw rechazo(MISMO_VIAJE, "Elija un viaje distinto al original.");
        }
        exigirViajeReservable(idViajeNuevo);

        // 1) Ocupa el asiento nuevo (solo si sigue bloqueado por la sesión del agente).
        if (asientos.ocuparAsientoDeSesion(nuevo.getIdViajeAsiento(), idSesion, pasaje.getIdPasajero()) != 1) {
            throw rechazo(ASIENTO_NO_DISPONIBLE, ASIENTO_TOMADO);
        }
        // 2) Pasa el pasaje al asiento nuevo (solo si nadie lo movió antes).
        if (historial.moverPasajeAlAsiento(idPasaje, original.getIdViajeAsiento(), nuevo.getIdViajeAsiento()) != 1) {
            throw rechazo(CAMBIO_NO_APLICADO, "No se pudo actualizar el pasaje. No se hizo ningún cambio.");
        }
        // 3) Deja libre el asiento anterior.
        if (historial.liberarAsientoOcupado(original.getIdViajeAsiento()) != 1) {
            throw rechazo(CAMBIO_NO_APLICADO, "No se pudo liberar el asiento anterior. No se hizo ningún cambio.");
        }

        LocalDateTime ahora = LocalDateTime.now(reloj);
        Postergacion fila = new Postergacion();
        fila.setIdPasaje(idPasaje);
        fila.setIdVenta(pasaje.getIdVenta());
        fila.setIdViajeAnterior(original.getIdViaje().longValue());
        fila.setIdViajeNuevo(nuevo.getIdViaje().longValue());
        fila.setIdViajeAsientoAnterior(original.getIdViajeAsiento());
        fila.setIdViajeAsientoNuevo(nuevo.getIdViajeAsiento());
        fila.setImporteAdicional(importeAdicional);
        fila.setReferenciaPago(importeAdicional.signum() > 0 ? referenciaPago : null);
        fila.setFechaPostergacion(ahora);
        fila.setIdEmpleado(idEmpleado);
        fila = historial.save(fila);

        FilaCompra despues = compras.filaDelPasaje(idPasaje)
                .orElseThrow(() -> rechazo(CAMBIO_NO_APLICADO,
                        "No se pudo leer el pasaje actualizado. No se hizo ningún cambio."));

        // Avisa a los mapas de asientos abiertos (Portal y SE) para que se actualicen.
        publicador.publishEvent(new AsientoCambiadoEvento(
                original.getIdViaje().longValue(), original.getIdAsiento(), "disponible"));
        publicador.publishEvent(new AsientoCambiadoEvento(
                nuevo.getIdViaje().longValue(), nuevo.getIdAsiento(), "ocupado"));

        return new ConfirmacionPostergacionDto(true, fila.getIdPostergacion(), idPasaje, pasaje.getIdVenta(),
                original.getIdViaje(), antes.numeroAsiento(),
                despues.idViaje(), despues.origen(), despues.destino(), despues.fechaSalida(), despues.horaSalida(),
                despues.numeroAsiento(), importeAdicional, fila.getReferenciaPago(), ahora);
    }

    private void exigirViajeReservable(long idViajeNuevo) {
        try {
            validadorReserva.exigirReservable(idViajeNuevo);
        } catch (ReservaNoPermitidaException noReservable) {
            throw rechazo(VIAJE_NO_RESERVABLE, noReservable.getMessage());
        } catch (ViajeNoEncontradoException inexistente) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, inexistente.getMessage());
        }
    }

    private static PostergacionRechazadaException rechazo(String codigo, String motivo) {
        return new PostergacionRechazadaException(codigo, motivo);
    }
}
