package com.transportes.configuracion.excepciones;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Formato unico y consistente para todas las respuestas de error de la API.
 * Nunca incluye detalles internos (stacktraces, mensajes de excepciones de
 * base de datos, etc.), solo informacion segura para mostrar al frontend.
 */
public class RespuestaError {

    private final LocalDateTime fecha;
    private final int status;
    private final String error;
    private final String mensaje;
    private final String ruta;
    private final List<String> detalles;

    public RespuestaError(int status, String error, String mensaje, String ruta, List<String> detalles) {
        this.fecha = LocalDateTime.now();
        this.status = status;
        this.error = error;
        this.mensaje = mensaje;
        this.ruta = ruta;
        this.detalles = detalles;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public int getStatus() {
        return status;
    }

    public String getError() {
        return error;
    }

    public String getMensaje() {
        return mensaje;
    }

    public String getRuta() {
        return ruta;
    }

    public List<String> getDetalles() {
        return detalles;
    }
}
