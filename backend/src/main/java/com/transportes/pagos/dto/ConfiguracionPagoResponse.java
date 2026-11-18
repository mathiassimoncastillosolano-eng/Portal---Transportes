package com.transportes.pagos.dto;

import java.util.List;

/**
 * Entornos de pago que puede usar el usuario. Solo lleva datos públicos (Public Key), nunca tokens ni claves
 * secretas.
 * @param entornos entornos permitidos para este usuario
 * @param entornoPorDefecto el que la pantalla debe marcar (PRODUCTION si está disponible)
 */
public record ConfiguracionPagoResponse(List<EntornoDisponible> entornos, String entornoPorDefecto) {

    /**
     * @param codigo SANDBOX o PRODUCTION
     * @param disponible false si faltan credenciales en el servidor (la pantalla lo muestra deshabilitado)
     * @param publicKey Public Key del entorno, o null si el servidor no la tiene
     */
    public record EntornoDisponible(String codigo, boolean disponible, String publicKey) {
    }
}
