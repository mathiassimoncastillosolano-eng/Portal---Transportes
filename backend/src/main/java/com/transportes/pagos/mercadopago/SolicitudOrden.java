package com.transportes.pagos.mercadopago;

import java.math.BigDecimal;

/** Datos para crear un pago en Mercado Pago. */
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

    /** true si lleva datos del pagador además de los obligatorios. */
    public boolean tieneDatosAdicionales() {
        return !vacio(nombrePagador) || !vacio(apellidoPagador) || !vacio(tituloItem);
    }

    private static boolean vacio(String valor) {
        return valor == null || valor.isBlank();
    }

    /** Oculta el token por si alguien imprime la solicitud en el log. */
    @Override
    public String toString() {
        return "SolicitudOrden[referencia=" + referenciaExterna + ", monto=" + monto + ", metodo=" + metodoPagoId
                + "/" + metodoPagoTipo + ", cuotas=" + cuotas + "]";
    }
}