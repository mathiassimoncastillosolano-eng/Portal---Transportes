package com.transportes.postergacion.excepciones;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * HU-02 · La postergación se rechaza (409). Lleva el motivo para mostrar al cliente y un código estable para que
 * el frontend sepa de qué tipo de rechazo se trata (por ejemplo, que puede elegir otro asiento).
 */
public class PostergacionRechazadaException extends ResponseStatusException {

    /** Códigos que viajan en {@code detalles}. Coinciden con CODIGOS_RECHAZO del frontend cuando existen allá. */
    public static final String PASAJE_NO_VIGENTE = "PASAJE_NO_VIGENTE";
    public static final String VIAJE_INICIADO = "VIAJE_INICIADO";
    public static final String ANTICIPACION_INSUFICIENTE = "ANTICIPACION_INSUFICIENTE";
    public static final String MISMO_VIAJE = "MISMO_VIAJE";
    public static final String VIAJE_NO_RESERVABLE = "VIAJE_NO_RESERVABLE";
    public static final String ASIENTO_NO_DISPONIBLE = "ASIENTO_NO_DISPONIBLE";
    public static final String SESION_VENCIDA = "SESION_VENCIDA";
    public static final String PAGO_INSUFICIENTE = "PAGO_INSUFICIENTE";
    public static final String CAMBIO_NO_APLICADO = "CAMBIO_NO_APLICADO";

    private final String codigo;

    public PostergacionRechazadaException(String codigo, String motivo) {
        super(HttpStatus.CONFLICT, motivo);
        this.codigo = codigo;
    }

    /** Código estable para el frontend (ej. ASIENTO_NO_DISPONIBLE). */
    public String getCodigo() {
        return codigo;
    }
}
