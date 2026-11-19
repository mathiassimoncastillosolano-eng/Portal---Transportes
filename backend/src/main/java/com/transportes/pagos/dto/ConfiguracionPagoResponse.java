package com.transportes.pagos.dto;

public record ConfiguracionPagoResponse(boolean disponible, String entorno, String publicKey, String moneda,
                                        String versionTerminos) {
}
