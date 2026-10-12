package com.transportes.pagos.mercadopago;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Vista mínima de una order de Mercado Pago (respuesta de POST/GET /v1/orders). Solo contiene lo necesario
 * para verificar la operación: nunca datos de tarjeta.
 *
 * @param id                identificador de la order (ORD...)
 * @param estado            status de la order: created, processing, action_required, processed, failed, canceled, expired, refunded...
 * @param estadoDetalle     status_detail de la order: accredited, in_process, pending_challenge, failed...
 * @param referenciaExterna external_reference que envió RutaLibre
 * @param montoTotal        total_amount de la order
 * @param montoPagado       total_paid_amount (puede ser null)
 * @param moneda            currency (puede ser null)
 * @param idPago            id de la primera transacción de pago (PAY...)
 * @param estadoPago        status de esa transacción
 * @param estadoDetallePago status_detail de esa transacción (motivo de rechazo)
 * @param urlDesafio3ds     transactions.payments[0].payment_method.transaction_security.url, si hay desafío 3DS
 */
public record OrdenMercadoPago(
        String id,
        String estado,
        String estadoDetalle,
        String referenciaExterna,
        BigDecimal montoTotal,
        BigDecimal montoPagado,
        String moneda,
        String idPago,
        String estadoPago,
        String estadoDetallePago,
        String urlDesafio3ds) {

    private static final Pattern ID_ORDEN = Pattern.compile("^ORD[A-Z0-9_-]{0,61}$");

    /**
     * Normaliza el identificador de una order recibido en una notificación. Los ids de order de Mercado Pago
     * empiezan por {@code ORD} (p. ej. ORD01M28P44G5FG8RJPM579EH56FV) y van en mayúsculas; las pruebas de la
     * documentación y el botón "Simular" del panel pueden enviar otros valores (p. ej. 123456) que NO son una order:
     * consultarlos a la API solo produce {@code invalid_path_param}.
     *
     * @return el id normalizado, o null si no tiene forma de id de order
     */
    public static String normalizarIdOrden(String id) {
        if (id == null) {
            return null;
        }
        String normalizado = id.trim().toUpperCase(Locale.ROOT);
        return ID_ORDEN.matcher(normalizado).matches() ? normalizado : null;
    }

    /** Única condición de aprobación: order procesada y acreditada. */
    public boolean aprobada() {
        return "processed".equals(estado) && "accredited".equals(estadoDetalle);
    }

    public boolean requiereDesafio3ds() {
        return "action_required".equals(estado) && urlDesafio3ds != null && !urlDesafio3ds.isBlank();
    }

    /** Resultado definitivo sin cobro (o con el cobro revertido). */
    public boolean fallidaOCerrada() {
        return "failed".equals(estado) || "canceled".equals(estado) || "expired".equals(estado)
                || "refunded".equals(estado) || "charged_back".equals(estado);
    }

    /** El motivo más específico disponible (para mensajes al usuario y registro). */
    public String motivo() {
        if (estadoDetallePago != null && !estadoDetallePago.isBlank()) {
            return estadoDetallePago;
        }
        return estadoDetalle;
    }
}
