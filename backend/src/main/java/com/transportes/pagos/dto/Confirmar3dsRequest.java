package com.transportes.pagos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record Confirmar3dsRequest(
        @NotBlank(message = "Falta el token de pago")
        @Pattern(regexp = "^tkn_(test|live)_[A-Za-z0-9]{8,64}$", message = "Token de pago no válido") String token,
        @NotNull @Valid Parametros3ds parametros) {

    public record Parametros3ds(
            @NotBlank @Size(max = 10) String eci,
            @NotBlank @Size(max = 200) String xid,
            @NotBlank @Size(max = 200) String cavv,
            @NotBlank @Size(max = 10) String protocolVersion,
            @NotBlank @Size(max = 200) String directoryServerTransactionId) {
    }

    @Override
    public String toString() {
        return "Confirmar3dsRequest[]";
    }
}
