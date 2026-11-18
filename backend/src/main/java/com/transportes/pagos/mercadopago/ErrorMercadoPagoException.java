package com.transportes.pagos.mercadopago;

/** Error al comunicarse con Mercado Pago. El mensaje nunca incluye credenciales ni tokens. */
public class ErrorMercadoPagoException extends RuntimeException {

    public enum Tipo {
        /** Falta el Access Token en la configuración del backend. */
        NO_CONFIGURADO,
        /** 4xx: Mercado Pago rechazó la solicitud y la order no se creó. */
        SOLICITUD_INVALIDA,
        /** 402: Mercado Pago rechazó el pago. */
        PAGO_RECHAZADO,
        /** 404: no existe lo que se buscó. */
        NO_ENCONTRADO,
        /** Timeout, error de red, 5xx, 423 o 429: no se sabe qué pasó; hay que verificar antes de reintentar. */
        RESULTADO_DESCONOCIDO
    }

    private final Tipo tipo;
    private final int estadoHttp;
    private final String codigo;
    private final transient OrdenMercadoPago ordenAdjunta;
    private final String detalle;

    public ErrorMercadoPagoException(Tipo tipo, int estadoHttp, String codigo, String mensaje, OrdenMercadoPago ordenAdjunta) {
        this(tipo, estadoHttp, codigo, mensaje, ordenAdjunta, null);
    }

    public ErrorMercadoPagoException(Tipo tipo, int estadoHttp, String codigo, String mensaje, OrdenMercadoPago ordenAdjunta,
                                     String detalle) {
        super(mensaje);
        this.tipo = tipo;
        this.estadoHttp = estadoHttp;
        this.codigo = codigo;
        this.ordenAdjunta = ordenAdjunta;
        this.detalle = detalle;
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

    /** Código de error de Mercado Pago, si vino en la respuesta. */
    public String getCodigo() {
        return codigo;
    }

    /** Order fallida que traen algunas respuestas de error (402); puede ser null. */
    public OrdenMercadoPago getOrdenAdjunta() {
        return ordenAdjunta;
    }

    /**
     * Detalle del error (por ejemplo, qué campo rechazó Mercado Pago). Acotado y sin correos ni credenciales.
     * Puede ser null.
     */
    public String getDetalle() {
        return detalle;
    }

    /**
     * Para el Webhook: true si conviene que Mercado Pago reenvíe el aviso (fallo temporal o de configuración
     * nuestra, que al corregirse sí funcionará). Un 400, 404 o 422 no mejora al repetir.
     */
    public boolean esReintentable() {
        return switch (tipo) {
            case RESULTADO_DESCONOCIDO, NO_CONFIGURADO -> true;
            case SOLICITUD_INVALIDA -> estadoHttp == 401 || estadoHttp == 403;
            case PAGO_RECHAZADO, NO_ENCONTRADO -> false;
        };
    }
}
