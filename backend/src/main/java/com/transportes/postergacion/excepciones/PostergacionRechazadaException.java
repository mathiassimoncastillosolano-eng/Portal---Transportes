package com.transportes.postergacion.excepciones;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Error 409 cuando no se puede cambiar el pasaje. Lleva el mensaje y un código del motivo. */
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

    /** Código del motivo del rechazo. */
    public String getCodigo() {
        return codigo;
    }
}
