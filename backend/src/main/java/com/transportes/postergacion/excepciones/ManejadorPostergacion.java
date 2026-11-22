package com.transportes.postergacion.excepciones;

import java.util.List;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.transportes.configuracion.excepciones.RespuestaError;
import com.transportes.postergacion.controladores.CambioViajeAgenciaControlador;
import com.transportes.postergacion.controladores.PostergacionControlador;

import jakarta.servlet.http.HttpServletRequest;

/** Convierte el rechazo de un cambio de pasaje (Portal o Sistema Empresarial) en una respuesta 409. */
@RestControllerAdvice(assignableTypes = {PostergacionControlador.class, CambioViajeAgenciaControlador.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ManejadorPostergacion {

    /** 409 con el motivo y el código del rechazo en detalles. */
    @ExceptionHandler(PostergacionRechazadaException.class)
    public ResponseEntity<RespuestaError> manejarRechazo(PostergacionRechazadaException excepcion,
                                                         HttpServletRequest request) {
        HttpStatus status = HttpStatus.CONFLICT;
        RespuestaError cuerpo = new RespuestaError(status.value(), status.getReasonPhrase(),
                excepcion.getReason(), request.getRequestURI(), List.of(excepcion.getCodigo()));
        return ResponseEntity.status(status).body(cuerpo);
    }
}
