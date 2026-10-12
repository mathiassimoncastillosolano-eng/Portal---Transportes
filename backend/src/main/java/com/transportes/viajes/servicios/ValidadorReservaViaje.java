package com.transportes.viajes.servicios;

import java.time.Clock;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.viajes.entidades.Viaje;
import com.transportes.viajes.excepciones.ReservaNoPermitidaException;
import com.transportes.viajes.excepciones.ViajeNoEncontradoException;
import com.transportes.viajes.repositorios.ViajeRepositorio;
import com.transportes.viajes.reglas.PoliticaReservaViaje;
import com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva;

/**
 * Punto único donde el backend comprueba que un viaje todavía admite reservas (estado PROGRAMADO, no salió y
 * faltan al menos 20 minutos). Lo invocan la creación de la sesión de reserva, el bloqueo de cada asiento,
 * "Continuar al pago" y el inicio del pago. Usa la hora del servidor (reloj de negocio), nunca la del navegador.
 *
 * <p>No comprueba los asientos: la disponibilidad real la garantiza el bloqueo atómico de cada asiento.
 * Tampoco se invoca al registrar una compra ya cobrada: si el pago se inició a tiempo, un retraso de
 * Mercado Pago no debe dejar sin pasaje a quien ya pagó.</p>
 */
@Service
public class ValidadorReservaViaje {

    private final ViajeRepositorio viajes;
    private final Clock reloj;

    public ValidadorReservaViaje(ViajeRepositorio viajes, Clock relojNegocio) {
        this.viajes = viajes;
        this.reloj = relojNegocio;
    }

    /** @throws ViajeNoEncontradoException si no existe; @throws ReservaNoPermitidaException si no se puede reservar */
    @Transactional(readOnly = true)
    public void exigirReservable(Long idViaje) {
        Viaje viaje = viajes.findById(idViaje).orElseThrow(() -> new ViajeNoEncontradoException(idViaje));
        LocalDateTime ahora = LocalDateTime.now(reloj);
        // Asientos 1/1: aquí solo importa el estado administrativo y el tiempo.
        EstadoReserva estado = PoliticaReservaViaje.evaluar(viaje.getEstadoViaje(), viaje.getFechaSalida(),
                viaje.getHoraSalida(), 1, 1, ahora);
        if (!estado.reservable()) {
            throw new ReservaNoPermitidaException(PoliticaReservaViaje.mensajeRechazo(estado));
        }
    }
}
