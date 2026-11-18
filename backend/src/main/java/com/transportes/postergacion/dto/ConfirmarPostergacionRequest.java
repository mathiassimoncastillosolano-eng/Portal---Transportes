package com.transportes.postergacion.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Lo que envía el navegador para confirmar el cambio. No trae el usuario: sale del token.
 * @param idViajeNuevo viaje al que se pasa el pasaje
 * @param idAsiento asiento elegido en ese viaje (ya bloqueado por la sesión de reserva)
 * @param tokenSesion sesión de reserva que bloqueó ese asiento
 * @param montoAdicional diferencia pagada (0 si no hubo cobro); el pago todavía es simulado
 * @param referenciaPago referencia del pago simulado (obligatoria si el monto es mayor que 0)
 */
public record ConfirmarPostergacionRequest(
        @NotNull(message = "El viaje nuevo es obligatorio") Long idViajeNuevo,
        @NotNull(message = "El asiento nuevo es obligatorio") Integer idAsiento,
        @NotBlank(message = "El tokenSesion es obligatorio") @Size(max = 2000) String tokenSesion,
        @NotNull(message = "El monto adicional es obligatorio")
        @DecimalMin(value = "0.00", message = "El monto adicional no puede ser negativo")
        @DecimalMax(value = "99999999.99", message = "El monto adicional no es válido") BigDecimal montoAdicional,
        @Size(max = 64, message = "La referencia del pago no es válida") String referenciaPago) {
}
