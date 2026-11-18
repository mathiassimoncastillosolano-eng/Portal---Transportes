package com.transportes.postergacion.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Datos que envía el navegador para confirmar el cambio: viaje nuevo, asiento, sesión y pago. */
public record ConfirmarPostergacionRequest(
        @NotNull(message = "El viaje nuevo es obligatorio") Long idViajeNuevo,
        @NotNull(message = "El asiento nuevo es obligatorio") Integer idAsiento,
        @NotBlank(message = "El tokenSesion es obligatorio") @Size(max = 2000) String tokenSesion,
        @NotNull(message = "El monto adicional es obligatorio")
        @DecimalMin(value = "0.00", message = "El monto adicional no puede ser negativo")
        @DecimalMax(value = "99999999.99", message = "El monto adicional no es válido") BigDecimal montoAdicional,
        @Size(max = 64, message = "La referencia del pago no es válida") String referenciaPago) {
}
