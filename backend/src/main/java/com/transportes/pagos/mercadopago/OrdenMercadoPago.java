package com.transportes.pagos.mercadopago;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Lo mínimo de una order de Mercado Pago que necesitamos para verificar el pago (nunca datos de tarjeta).
 * @param id id de la order (ORD...)
 * @param estado estado de la order: created, processing, action_required, processed, failed, canceled, expired,
 * refunded...
 * @param estadoDetalle detalle del estado: accredited, in_process, pending_challenge, failed...
 * @param referenciaExterna nuestra referencia de la operación
 * @param montoTotal monto total de la order
 * @param montoPagado monto pagado (puede ser null)
 * @param moneda moneda (puede ser null)
 * @param idPago id de la transacción de pago (PAY...)
 * @param estadoPago estado de esa transacción
 * @param estadoDetallePago motivo de rechazo de esa transacción
 * @param urlDesafio3ds URL de la verificación 3DS, si el banco la pide
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
     * Limpia el id de order que llega en un aviso. Los ids reales empiezan por ORD y van en mayúsculas; la prueba
     * "Simular" puede mandar otros valores (como 123456) que no son orders.
     * @return el id limpio, o null si no parece un id de order
     */
    public static String normalizarIdOrden(String id) {
        if (id == null) {
            return null;
        }
        String normalizado = id.trim().toUpperCase(Locale.ROOT);
        return ID_ORDEN.matcher(normalizado).matches() ? normalizado : null;
    }

    /** Único caso aprobado: order procesada (processed) y acreditada (accredited). */
    public boolean aprobada() {
        return "processed".equals(estado) && "accredited".equals(estadoDetalle);
    }

    /** true si el banco pide la verificación 3DS (un paso extra del comprador). */
    public boolean requiereDesafio3ds() {
        return "action_required".equals(estado) && urlDesafio3ds != null && !urlDesafio3ds.isBlank();
    }

    /** true si terminó sin cobro (fallida, cancelada, vencida o devuelta). */
    public boolean fallidaOCerrada() {
        return "failed".equals(estado) || "canceled".equals(estado) || "expired".equals(estado)
                || "refunded".equals(estado) || "charged_back".equals(estado);
    }

    /** El motivo más específico disponible, para el mensaje al usuario y el log. */
    public String motivo() {
        if (estadoDetallePago != null && !estadoDetallePago.isBlank()) {
            return estadoDetallePago;
        }
        return estadoDetalle;
    }
}
