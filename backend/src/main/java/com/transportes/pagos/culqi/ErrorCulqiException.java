package com.transportes.pagos.culqi;

public class ErrorCulqiException extends RuntimeException {

    public enum Tipo {
        NO_CONFIGURADO,
        SOLICITUD_INVALIDA,
        PAGO_RECHAZADO,
        NO_ENCONTRADO,
        RESULTADO_DESCONOCIDO
    }

    private final Tipo tipo;
    private final int estadoHttp;
    private final String codigo;
    private final String mensajeUsuario;
    private final String idCargo;
    private final String detalle;

    public ErrorCulqiException(Tipo tipo, int estadoHttp, String codigo, String mensaje, String mensajeUsuario,
                               String idCargo, String detalle) {
        super(mensaje);
        this.tipo = tipo;
        this.estadoHttp = estadoHttp;
        this.codigo = codigo;
        this.mensajeUsuario = mensajeUsuario;
        this.idCargo = idCargo;
        this.detalle = detalle;
    }

    public ErrorCulqiException(Tipo tipo, String mensaje) {
        this(tipo, 0, null, mensaje, null, null, null);
    }

    public Tipo getTipo() {
        return tipo;
    }

    public int getEstadoHttp() {
        return estadoHttp;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getMensajeUsuario() {
        return mensajeUsuario;
    }

    public String getIdCargo() {
        return idCargo;
    }

    public String getDetalle() {
        return detalle;
    }

    public boolean esReintentable() {
        return switch (tipo) {
            case RESULTADO_DESCONOCIDO, NO_CONFIGURADO -> true;
            case SOLICITUD_INVALIDA -> estadoHttp == 401 || estadoHttp == 403;
            case PAGO_RECHAZADO, NO_ENCONTRADO -> false;
        };
    }
}
