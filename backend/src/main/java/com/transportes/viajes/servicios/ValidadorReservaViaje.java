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

/** Revisa que un viaje todavía se pueda reservar. */
@Service
public class ValidadorReservaViaje {

    private final ViajeRepositorio viajes;
    private final Clock reloj;

    public ValidadorReservaViaje(ViajeRepositorio viajes, Clock relojNegocio) {
        this.viajes = viajes;
        this.reloj = relojNegocio;
    }

    /** Lanza error si el viaje no existe o ya no se puede reservar. */
    @Transactional(readOnly = true)
    public void exigirReservable(Long idViaje) {
        Viaje viaje = viajes.findById(idViaje).orElseThrow(() -> new ViajeNoEncontradoException(idViaje));
        LocalDateTime ahora = LocalDateTime.now(reloj);
        // Se pasan asientos 1 de 1 a propósito: aquí solo importan el estado del viaje y la hora.
        EstadoReserva estado = PoliticaReservaViaje.evaluar(viaje.getEstadoViaje(), viaje.getFechaSalida(),
                viaje.getHoraSalida(), 1, 1, ahora);
        if (!estado.reservable()) {
            throw new ReservaNoPermitidaException(PoliticaReservaViaje.mensajeRechazo(estado));
        }
    }
}
