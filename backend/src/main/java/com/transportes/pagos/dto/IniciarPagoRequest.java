package com.transportes.pagos.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record IniciarPagoRequest(
        @NotNull(message = "El viaje es obligatorio") Long idViaje,
        @NotBlank(message = "El tokenSesion es obligatorio") @Size(max = 2000) String tokenSesion,
        @NotBlank(message = "La clave de idempotencia es obligatoria")
        @Pattern(regexp = "^[A-Za-z0-9-]{16,64}$", message = "La clave de idempotencia no es válida")
        String claveIdempotencia,
        @NotBlank(message = "El medio de pago es obligatorio")
        @Pattern(regexp = "^(TARJETA|YAPE)$", message = "Medio de pago no admitido") String medioPago,
        @NotBlank(message = "Falta el token de pago")
        @Pattern(regexp = "^(tkn|ype)_(test|live)_[A-Za-z0-9]{8,64}$", message = "Token de pago no válido")
        String token,
        @NotBlank(message = "El correo del pagador es obligatorio") @Email(message = "Correo no válido")
        @Size(max = 150) String emailPagador,
        @AssertTrue(message = "Debes aceptar los términos y condiciones y la política de cambios y devoluciones")
        boolean aceptaTerminos) {

    @Override
    public String toString() {
        return "IniciarPagoRequest[idViaje=" + idViaje + ", medio=" + medioPago + "]";
    }
}
