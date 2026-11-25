package com.transportes.postergacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Lo que envía el Sistema Empresarial para confirmar un cambio sin cobro.
 * aceptaSinDevolucion: el agente marcó que el pasajero fue informado de que la diferencia no se devuelve.
 */
public record ConfirmarCambioAgenciaRequest(
        @NotNull(message = "Elija el viaje nuevo") Long idViajeNuevo,
        @NotNull(message = "Elija el asiento nuevo") Integer idAsiento,
        @NotBlank(message = "Falta la reserva temporal del asiento") @Size(max = 2000) String tokenSesion,
        boolean aceptaSinDevolucion) {
}
