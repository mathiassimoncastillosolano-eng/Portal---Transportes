package com.transportes.pagos.mercadopago;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Pattern;

/** Datos de un pago (order) devueltos por Mercado Pago. */
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

    /** Limpia el id de pago que llega en un aviso. Devuelve null si no es un id válido. */
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
