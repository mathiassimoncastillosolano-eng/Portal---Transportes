package com.transportes.pagos.mercadopago;

import java.math.BigDecimal;

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
