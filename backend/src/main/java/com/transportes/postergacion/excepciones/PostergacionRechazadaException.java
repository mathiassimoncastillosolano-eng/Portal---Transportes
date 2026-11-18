package com.transportes.postergacion.excepciones;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Error de HU-02 cuando el cambio se rechaza (409). Lleva el mensaje para el cliente y un código fijo para que el
 * frontend sepa qué pasó (por ejemplo, ASIENTO_NO_DISPONIBLE: puede elegir otro asiento).
 */
public class PostergacionRechazadaException extends ResponseStatusException {

    /** Códigos que viajan en detalles. Son los mismos que CODIGOS_RECHAZO del frontend. */
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

    /** Código fijo del motivo, por ejemplo ASIENTO_NO_DISPONIBLE. */
    public String getCodigo() {
        return codigo;
    }
}
