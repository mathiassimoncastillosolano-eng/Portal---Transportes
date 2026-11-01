package com.transportes.pagos.dto;

import java.util.List;

/**
 * Entornos de pago que el usuario autenticado puede usar, calculados en el backend.
 *
 * <p>Solo contiene datos públicos: la Public Key de Mercado Pago es pública por diseño (la usa MercadoPago.js en el
 * navegador). Nunca incluye Access Tokens ni claves secretas de Webhooks.</p>
 *
 * @param entornos          entornos permitidos para ESTE usuario (un comprador normal solo recibe PRODUCTION)
 * @param entornoPorDefecto entorno que la interfaz debe preseleccionar (siempre PRODUCTION si está disponible)
 */
public record ConfiguracionPagoResponse(List<EntornoDisponible> entornos, String entornoPorDefecto) {

    /**
     * @param codigo     SANDBOX | PRODUCTION
     * @param disponible false si faltan credenciales en el servidor (la interfaz lo muestra deshabilitado)
     * @param publicKey  Public Key del entorno; null si el servidor no la tiene (solo ocurre en SANDBOX, donde el
     *                   frontend puede usar su VITE_MERCADOPAGO_PUBLIC_KEY heredada)
     */
    public record EntornoDisponible(String codigo, boolean disponible, String publicKey) {
    }
}
