package com.transportes.configuracion.excepciones;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.auth.excepciones.AccesoEmpresarialDenegadoException;
import com.transportes.auth.excepciones.CredencialesInvalidasException;
import com.transportes.auth.excepciones.CuentaExistenteException;
import com.transportes.auth.excepciones.GoogleServicioNoDisponibleException;
import com.transportes.auth.excepciones.GoogleTokenInvalidoException;
import com.transportes.auth.excepciones.RecuperacionContrasenaException;
import com.transportes.usuarios.excepciones.CorreoYaRegistradoException;
import com.transportes.usuarios.excepciones.UsuarioNoEncontradoException;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

/** Atrapa los errores de toda la API y los convierte en respuestas con código HTTP y mensaje. */
@Slf4j
@RestControllerAdvice
public class ManejadorGlobalExcepciones {

    /** 409: el correo ya tiene cuenta. */
    @ExceptionHandler(CorreoYaRegistradoException.class)
    public ResponseEntity<RespuestaError> manejarCorreoDuplicado(
            CorreoYaRegistradoException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.CONFLICT, excepcion.getMessage(), request, null);
    }

    /** 409 si se rompió una regla de la base, como un dato repetido; si no, 500. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<RespuestaError> manejarIntegridad(
            DataIntegrityViolationException excepcion, HttpServletRequest request) {
        Throwable causa = excepcion;
        while (causa != null) {
            if (causa instanceof org.hibernate.exception.ConstraintViolationException restriccion
                    && "23505".equals(restriccion.getSQLState())
                    && "uq_usuario_correo".equals(restriccion.getConstraintName())) {
                return construirRespuesta(HttpStatus.CONFLICT,
                        "El correo ya está registrado", request, null);
            }
            causa = causa.getCause();
        }
        return construirRespuesta(HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo guardar la cuenta", request, null);
    }

    /** Errores lanzados con ResponseStatusException: se responde con el código que traen. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<RespuestaError> manejarSolicitud(
            ResponseStatusException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.valueOf(excepcion.getStatusCode().value()),
                excepcion.getReason() == null ? "Solicitud no válida" : excepcion.getReason(), request, null);
    }

    /** 400: el cuerpo no es un JSON válido. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<RespuestaError> manejarJsonInvalido(
            HttpMessageNotReadableException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.BAD_REQUEST,
                "El cuerpo de la solicitud debe ser un JSON válido", request, null);
    }

    /** Libro de Reclamaciones: usa el código y los detalles que trae ReclamoException. */
    @ExceptionHandler(com.transportes.reclamos.excepciones.ReclamoException.class)
    public ResponseEntity<RespuestaError> manejarReclamo(
            com.transportes.reclamos.excepciones.ReclamoException excepcion, HttpServletRequest request) {
        return construirRespuesta(excepcion.getStatus(), excepcion.getMessage(), request, excepcion.getDetalles());
    }

    /** Pagos: usa el código y el mensaje que trae PagoException. */
    @ExceptionHandler(com.transportes.pagos.excepciones.PagoException.class)
    public ResponseEntity<RespuestaError> manejarPago(
            com.transportes.pagos.excepciones.PagoException excepcion, HttpServletRequest request) {
        return construirRespuesta(excepcion.getStatus(), excepcion.getMessage(), request, null);
    }

    /** Mercado Pago no respondió a tiempo: el resultado se revisa después (el pago NO se da por aprobado). */
    @ExceptionHandler(com.transportes.pagos.mercadopago.ErrorMercadoPagoException.class)
    public ResponseEntity<RespuestaError> manejarProveedorPago(
            com.transportes.pagos.mercadopago.ErrorMercadoPagoException excepcion, HttpServletRequest request) {
        log.warn("Error del proveedor de pagos en {}: {}", request.getRequestURI(), excepcion.getTipo());
        return construirRespuesta(HttpStatus.SERVICE_UNAVAILABLE,
                "No pudimos comunicarnos con Mercado Pago. Inténtalo nuevamente en unos segundos.", request, null);
    }

    /** 400: parámetros de la URL no válidos. */
    @ExceptionHandler(org.springframework.web.method.annotation.HandlerMethodValidationException.class)
    public ResponseEntity<RespuestaError> manejarValidacionParametros(Exception excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, "Los datos enviados no son validos.", request, null);
    }

    /** 404: la ruta no existe (o no acepta ese método HTTP). */
    @ExceptionHandler({org.springframework.web.servlet.resource.NoResourceFoundException.class,
            org.springframework.web.HttpRequestMethodNotSupportedException.class})
    public ResponseEntity<RespuestaError> manejarRutaInexistente(Exception excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.NOT_FOUND, "Recurso no encontrado.", request, null);
    }

    /** 401: correo o contraseña incorrectos. */
    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<RespuestaError> manejarCredencialesInvalidas(
            CredencialesInvalidasException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED, excepcion.getMessage(), request, null);
    }

    /** 403: un cliente intentó entrar al Sistema Empresarial. */
    @ExceptionHandler(AccesoEmpresarialDenegadoException.class)
    public ResponseEntity<RespuestaError> manejarAccesoEmpresarialDenegado(
            AccesoEmpresarialDenegadoException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.FORBIDDEN, excepcion.getMessage(), request, null);
    }

    /**
     * Recuperación de contraseña: el servicio ya trae un código y un mensaje seguros (no revela si el correo
     * existe).
     */
    @ExceptionHandler(RecuperacionContrasenaException.class)
    public ResponseEntity<RespuestaError> manejarRecuperacionContrasena(
            RecuperacionContrasenaException excepcion, HttpServletRequest request) {
        return construirRespuesta(excepcion.getStatus(), excepcion.getMessage(), request, null);
    }

    /** 401: el token de Google no es válido. */
    @ExceptionHandler(GoogleTokenInvalidoException.class)
    public ResponseEntity<RespuestaError> manejarGoogleTokenInvalido(
            GoogleTokenInvalidoException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED, excepcion.getMessage(), request, null);
    }

    /** 409: el correo ya tiene una cuenta con contraseña. */
    @ExceptionHandler(CuentaExistenteException.class)
    public ResponseEntity<RespuestaError> manejarCuentaExistente(
            CuentaExistenteException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.CONFLICT, excepcion.getMessage(), request, null);
    }

    /** 503: no se pudo consultar a Google. */
    @ExceptionHandler(GoogleServicioNoDisponibleException.class)
    public ResponseEntity<RespuestaError> manejarGoogleNoDisponible(
            GoogleServicioNoDisponibleException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.SERVICE_UNAVAILABLE, excepcion.getMessage(), request, null);
    }

    /** 401: falta iniciar sesión. */
    @ExceptionHandler({AuthenticationException.class})
    public ResponseEntity<RespuestaError> manejarNoAutenticado(
            AuthenticationException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED,
                "No autenticado. Inicie sesion nuevamente.", request, null);
    }

    /** 403: hay sesión, pero el rol no tiene permiso. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<RespuestaError> manejarAccesoDenegado(
            AccessDeniedException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.FORBIDDEN,
                "No tiene permisos para acceder a este recurso.", request, null);
    }

    /** 404: el usuario no existe. */
    @ExceptionHandler(UsuarioNoEncontradoException.class)
    public ResponseEntity<RespuestaError> manejarUsuarioNoEncontrado(
            UsuarioNoEncontradoException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.NOT_FOUND, excepcion.getMessage(), request, null);
    }

    /** 400: falló una validación @Valid; en detalles va cada campo con su mensaje. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<RespuestaError> manejarValidacion(
            MethodArgumentNotValidException excepcion, HttpServletRequest request) {
        List<String> detalles = excepcion.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .toList();
        return construirRespuesta(HttpStatus.BAD_REQUEST,
                "Los datos enviados no son validos.", request, detalles);
    }

    /** 400: falta un parámetro o tiene un tipo incorrecto. */
    @ExceptionHandler({org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    public ResponseEntity<RespuestaError> manejarParametros(Exception excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.BAD_REQUEST,
                "Revisa origen, destino y fecha (AAAA-MM-DD).", request, null);
    }

    /** 410: venció la sesión de reserva de asientos. */
    @ExceptionHandler(com.transportes.viajes.excepciones.SesionExpiradaException.class)
    public ResponseEntity<RespuestaError> manejarSesionExpirada(
            com.transportes.viajes.excepciones.SesionExpiradaException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.GONE, excepcion.getMessage(), request, null);
    }

    /** 401: el token de sesión de reserva es falso o de otro viaje. */
    @ExceptionHandler(com.transportes.viajes.excepciones.SesionInvalidaException.class)
    public ResponseEntity<RespuestaError> manejarSesionInvalida(
            com.transportes.viajes.excepciones.SesionInvalidaException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED, excepcion.getMessage(), request, null);
    }

    /** El navegador cerró una conexión SSE (tiempo real): no hay a quién responder, así que no se hace nada. */
    @ExceptionHandler({org.springframework.web.context.request.async.AsyncRequestNotUsableException.class,
            java.io.IOException.class})
    public void manejarIoDeStream(Exception excepcion) {
        log.debug("Conexión de streaming cerrada: {}", excepcion.getMessage());
    }

        /**
         * 500: cualquier error no previsto. Se registra en el log y al frontend solo le llega un mensaje genérico.
         */
    @ExceptionHandler(Exception.class)
        public ResponseEntity<RespuestaError> manejarErrorGeneral(
                Exception excepcion, HttpServletRequest request) {
        log.error("Error inesperado en {} {}", request.getMethod(), request.getRequestURI(), excepcion);
        return construirRespuesta(HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrio un error inesperado. Intente nuevamente mas tarde.", request, null);
    }

    private ResponseEntity<RespuestaError> construirRespuesta(
            HttpStatus status, String mensaje, HttpServletRequest request, List<String> detalles) {
        RespuestaError cuerpo = new RespuestaError(
                status.value(), status.getReasonPhrase(), mensaje, request.getRequestURI(), detalles);
        return ResponseEntity.status(status).body(cuerpo);
    }

    /** 404: el viaje no existe. */
    @ExceptionHandler(com.transportes.viajes.excepciones.ViajeNoEncontradoException.class)
    public ResponseEntity<RespuestaError> manejarViajeNoEncontrado(
            com.transportes.viajes.excepciones.ViajeNoEncontradoException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.NOT_FOUND, excepcion.getMessage(), request, null);
    }

    /** 409: el asiento ya no está disponible. */
    @ExceptionHandler(com.transportes.viajes.excepciones.AsientoNoDisponibleException.class)
    public ResponseEntity<RespuestaError> manejarAsientoNoDisponible(
            com.transportes.viajes.excepciones.AsientoNoDisponibleException excepcion, HttpServletRequest request) {
        return construirRespuesta(HttpStatus.CONFLICT, excepcion.getMessage(), request, null);
    }

    /** 409: el viaje ya no admite reservas. */
    @ExceptionHandler(com.transportes.viajes.excepciones.ReservaNoPermitidaException.class)
    public ResponseEntity<RespuestaError> manejarReservaNoPermitida(
            com.transportes.viajes.excepciones.ReservaNoPermitidaException excepcion, HttpServletRequest request) {
        // La marca en detalles permite al frontend distinguir este caso de "asiento tomado por otro", que también
        // es 409.
        return construirRespuesta(HttpStatus.CONFLICT, excepcion.getMessage(), request,
                List.of("RESERVA_NO_PERMITIDA"));
    }
}
