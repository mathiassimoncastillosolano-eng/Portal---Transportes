package com.transportes.pagos.mercadopago;

import java.math.BigDecimal;

/**
 * Datos para crear una order online con procesamiento automático. El importe lo calcula el backend;
 * el token (tarjeta o Yape) lo genera MercadoPago.js en el navegador y es de un solo uso.
 */
public record SolicitudOrden(
        String referenciaExterna,
        BigDecimal monto,
        String descripcion,
        String emailPagador,
        String tipoDocumentoPagador,
        String numeroDocumentoPagador,
        String celularPagador,
        String metodoPagoId,
        String metodoPagoTipo,
        String token,
        int cuotas,
        String validacion3ds) {

    /** Evita que el token aparezca en registros si alguien imprime la solicitud. */
    @Override
    public String toString() {
        return "SolicitudOrden[referencia=" + referenciaExterna + ", monto=" + monto + ", metodo=" + metodoPagoId
                + "/" + metodoPagoTipo + ", cuotas=" + cuotas + "]";
    }
}
