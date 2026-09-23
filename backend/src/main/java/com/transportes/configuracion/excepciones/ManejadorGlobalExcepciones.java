package com.transportes.configuracion.excepciones;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.transportes.auth.excepciones.CredencialesInvalidasException;
import com.transportes.usuarios.excepciones.UsuarioNoEncontradoException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Manejador global de excepciones para toda la API.
 *
 * Centraliza la traduccion de excepciones de negocio a respuestas HTTP
 * consistentes y evita filtrar informacion sensible (mensajes de
 * excepciones internas, detalles de la base de datos, stacktraces) hacia el
 * frontend.
 */
@RestControllerAdvice
public class ManejadorGlobalExcepciones {

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<RespuestaError> manejarCredencialesInvalidas(
            CredencialesInvalidasException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED, excepcion.getMessage(), request, null);
    }

    @ExceptionHandler({AuthenticationException.class})
    public ResponseEntity<RespuestaError> manejarNoAutenticado(
            AuthenticationException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED,
                "No autenticado. Inicie sesion nuevamente.", request, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<RespuestaError> manejarAccesoDenegado(
            AccessDeniedException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.FORBIDDEN,
                "No tiene permisos para acceder a este recurso.", request, null);
    }

    @ExceptionHandler(UsuarioNoEncontradoException.class)
    public ResponseEntity<RespuestaError> manejarUsuarioNoEncontrado(
            UsuarioNoEncontradoException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.NOT_FOUND, excepcion.getMessage(), request, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<RespuestaError> manejarValidacion(
            MethodArgumentNotValidException excepcion, HttpServletRequest request) {
        List<String> detalles = excepcion.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .toList();
        return construirRespuesta(HttpStatus.BAD_REQUEST,
                "Los datos enviados no son validos.", request, detalles);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<RespuestaError> manejarErrorGeneral(
            Exception excepcion, HttpServletRequest request) {
        // No se expone excepcion.getMessage() al cliente: puede contener
        // detalles internos (por ejemplo, de la base de datos).
        return construirRespuesta(HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrio un error inesperado. Intente nuevamente mas tarde.", request, null);
    }

    private ResponseEntity<RespuestaError> construirRespuesta(
            HttpStatus status, String mensaje, HttpServletRequest request, List<String> detalles) {
        RespuestaError cuerpo = new RespuestaError(
                status.value(), status.getReasonPhrase(), mensaje, request.getRequestURI(), detalles);
        return ResponseEntity.status(status).body(cuerpo);
    }

    @ExceptionHandler(com.transportes.viajes.excepciones.ViajeNoEncontradoException.class)
    public ResponseEntity<RespuestaError> manejarViajeNoEncontrado(
                com.transportes.viajes.excepciones.ViajeNoEncontradoException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.NOT_FOUND, excepcion.getMessage(), request, null);
    }

    @ExceptionHandler(com.transportes.viajes.excepciones.AsientoNoDisponibleException.class)
    public ResponseEntity<RespuestaError> manejarAsientoNoDisponible(
                com.transportes.viajes.excepciones.AsientoNoDisponibleException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.CONFLICT, excepcion.getMessage(), request, null);
    }
}
