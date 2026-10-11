package com.transportes.pagos.mercadopago;

/** Fallo al comunicarse con la API de Mercado Pago. Nunca incluye credenciales ni tokens en el mensaje. */
public class ErrorMercadoPagoException extends RuntimeException {

    public enum Tipo {
        /** Falta el Access Token en la configuración del backend. */
        NO_CONFIGURADO,
        /** 4xx: la solicitud fue rechazada; la order no se creó. Es seguro reintentar con datos nuevos. */
        SOLICITUD_INVALIDA,
        /** 402: Mercado Pago no pudo procesar el pago (rechazo). */
        PAGO_RECHAZADO,
        /** 404: recurso inexistente. */
        NO_ENCONTRADO,
        /** Timeout, error de red, 5xx, 423 o 429: el resultado es DESCONOCIDO, hay que verificar antes de reintentar. */
        RESULTADO_DESCONOCIDO
    }

    private final Tipo tipo;
    private final int estadoHttp;
    private final String codigo;
    private final transient OrdenMercadoPago ordenAdjunta;

    public ErrorMercadoPagoException(Tipo tipo, int estadoHttp, String codigo, String mensaje, OrdenMercadoPago ordenAdjunta) {
        super(mensaje);
        this.tipo = tipo;
        this.estadoHttp = estadoHttp;
        this.codigo = codigo;
        this.ordenAdjunta = ordenAdjunta;
    }

    public ErrorMercadoPagoException(Tipo tipo, String mensaje) {
        this(tipo, 0, null, mensaje, null);
    }

    public Tipo getTipo() {
        return tipo;
    }

    public int getEstadoHttp() {
        return estadoHttp;
    }

    /** Código de error de Mercado Pago (p. ej. invalid_email_for_sandbox), si vino en la respuesta. */
    public String getCodigo() {
        return codigo;
    }

    /** Algunas respuestas de error (402) traen la order fallida; puede ser null. */
    public OrdenMercadoPago getOrdenAdjunta() {
        return ordenAdjunta;
    }
}
