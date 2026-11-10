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
        String validacion3ds,
        String deviceId,
        String nombrePagador,
        String apellidoPagador,
        String tituloItem) {

    public SolicitudOrden(String referenciaExterna, BigDecimal monto, String descripcion, String emailPagador,
            String tipoDocumentoPagador, String numeroDocumentoPagador, String celularPagador, String metodoPagoId,
            String metodoPagoTipo, String token, int cuotas, String validacion3ds) {
        this(referenciaExterna, monto, descripcion, emailPagador, tipoDocumentoPagador, numeroDocumentoPagador,
                celularPagador, metodoPagoId, metodoPagoTipo, token, cuotas, validacion3ds, null);
    }

    public SolicitudOrden(String referenciaExterna, BigDecimal monto, String descripcion, String emailPagador,
            String tipoDocumentoPagador, String numeroDocumentoPagador, String celularPagador, String metodoPagoId,
            String metodoPagoTipo, String token, int cuotas, String validacion3ds, String deviceId) {
        this(referenciaExterna, monto, descripcion, emailPagador, tipoDocumentoPagador, numeroDocumentoPagador,
                celularPagador, metodoPagoId, metodoPagoTipo, token, cuotas, validacion3ds, deviceId, null, null, null);
    }

    public boolean tieneDatosAdicionales() {
        return !vacio(nombrePagador) || !vacio(apellidoPagador) || !vacio(tituloItem);
    }

    private static boolean vacio(String valor) {
        return valor == null || valor.isBlank();
    }

    /** Evita que el token aparezca en registros si alguien imprime la solicitud. */
    @Override
    public String toString() {
        return "SolicitudOrden[referencia=" + referenciaExterna + ", monto=" + monto + ", metodo=" + metodoPagoId
                + "/" + metodoPagoTipo + ", cuotas=" + cuotas + "]";
    }
}