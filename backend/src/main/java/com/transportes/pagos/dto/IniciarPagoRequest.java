package com.transportes.pagos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Solicitud del navegador para iniciar el pago. A propósito NO tiene importe: el total lo calcula el backend
 * con los precios de los asientos bloqueados. Cualquier campo extra (p. ej. "monto") se ignora.
 * Tampoco hay datos de tarjeta: solo el token de un solo uso generado por MercadoPago.js.
 */
public record IniciarPagoRequest(
        @NotNull(message = "El viaje es obligatorio") Long idViaje,
        @NotBlank(message = "El tokenSesion es obligatorio") @Size(max = 2000) String tokenSesion,
        @NotBlank(message = "La clave de idempotencia es obligatoria")
        @Pattern(regexp = "^[A-Za-z0-9-]{16,64}$", message = "La clave de idempotencia no es válida")
        String claveIdempotencia,
        @NotBlank(message = "El medio de pago es obligatorio")
        @Pattern(regexp = "^(TARJETA|YAPE)$", message = "Medio de pago no admitido") String medioPago,
        @NotBlank(message = "Falta el token de pago") @Size(max = 300) String token,
        @Size(max = 40) @Pattern(regexp = "^[a-z_]*$", message = "Método de pago no válido") String metodoPagoId,
        @Size(max = 20) String tipoPago,
        @Min(value = 1, message = "Cuotas no válidas") @Max(value = 36, message = "Cuotas no válidas") Integer cuotas,
        @NotBlank(message = "El correo del pagador es obligatorio") @Email(message = "Correo no válido")
        @Size(max = 150) String emailPagador,
        @Size(max = 10) String tipoDocumento,
        @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9]*$", message = "Documento no válido") String numeroDocumento,
        @Size(max = 9) @Pattern(regexp = "^\\d*$", message = "Celular no válido") String celular) {

    @Override
    public String toString() {
        return "IniciarPagoRequest[idViaje=" + idViaje + ", medio=" + medioPago + ", metodo=" + metodoPagoId + "]";
    }
}
