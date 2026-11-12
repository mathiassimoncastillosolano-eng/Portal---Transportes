package com.transportes.reclamos.excepciones;

import java.util.List;

import org.springframework.http.HttpStatus;

public class ReclamoException extends RuntimeException {

    private final HttpStatus status;
    private final List<String> detalles;

    private ReclamoException(HttpStatus status, String mensaje, List<String> detalles) {
        super(mensaje);
        this.status = status;
        this.detalles = detalles;
    }

    public static ReclamoException invalido(String mensaje) {
        return new ReclamoException(HttpStatus.BAD_REQUEST, mensaje, null);
    }

    public static ReclamoException invalido(List<String> detalles) {
        return new ReclamoException(HttpStatus.BAD_REQUEST, "Los datos enviados no son validos.", detalles);
    }

    public static ReclamoException noEncontrado() {
        return new ReclamoException(HttpStatus.NOT_FOUND, "No encontramos la reclamación solicitada.", null);
    }

    public static ReclamoException conflicto(String mensaje) {
        return new ReclamoException(HttpStatus.CONFLICT, mensaje, null);
    }

    public static ReclamoException demasiadasSolicitudes() {
        return new ReclamoException(HttpStatus.TOO_MANY_REQUESTS,
                "Registraste varias reclamaciones en poco tiempo. Inténtalo nuevamente más tarde.", null);
    }

    public static ReclamoException noRegistrado() {
        return new ReclamoException(HttpStatus.SERVICE_UNAVAILABLE,
                "No pudimos registrar tu reclamación. Inténtalo nuevamente en unos minutos.", null);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public List<String> getDetalles() {
        return detalles;
    }
}
