package com.transportes.postergacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Pago de la diferencia de un cambio de viaje, registrado por el agente.
 * resultado: lo que marcó el POS (APROBADO o RECHAZADO). En efectivo no hace falta.
 * numeroOperacion: código del POS, obligatorio en tarjeta y Yape (de operación si se aprobó, de error si
 * se rechazó). Sin formato fijo porque cambia según el POS; el máximo de 64 es el tamaño de la columna.
 * claveIdempotencia: la genera el SE una vez por intento; si llega repetida no se registra otra vez.
 */
public record RegistrarPagoCambioRequest(
        @NotNull(message = "Elija el viaje nuevo") Long idViajeNuevo,
        @NotNull(message = "Elija el asiento nuevo") Integer idAsiento,
        @NotBlank(message = "Falta la reserva temporal del asiento") @Size(max = 2000) String tokenSesion,
        @NotBlank(message = "Elija el método de pago")
        @Pattern(regexp = "^(EFECTIVO|YAPE|TARJETA)$", message = "Método de pago no válido") String metodo,
        @Pattern(regexp = "^(APROBADO|RECHAZADO)$", message = "Resultado del pago no válido") String resultado,
        @Size(max = 64, message = "El código del POS es demasiado largo") String numeroOperacion,
        @NotBlank(message = "Falta la clave del intento") @Size(max = 64) String claveIdempotencia) {
}
