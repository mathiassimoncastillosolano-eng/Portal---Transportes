package com.transportes.pagos.dto;

import java.util.List;

/** Entornos de pago que puede usar el usuario y cuál se marca por defecto. */
public record ConfiguracionPagoResponse(List<EntornoDisponible> entornos, String entornoPorDefecto) {

    /** Un entorno de pago: su código, si está disponible y su clave pública. */
    public record EntornoDisponible(String codigo, boolean disponible, String publicKey) {
    }
}
