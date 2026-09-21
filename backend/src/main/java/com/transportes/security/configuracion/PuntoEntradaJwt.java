package com.transportes.security.configuracion;

import tools.jackson.databind.ObjectMapper;
import com.transportes.configuracion.excepciones.RespuestaError;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Punto de entrada invocado por Spring Security cuando una peticion llega a
 * un endpoint protegido sin autenticacion valida (sin token, token
 * invalido, token expirado o token invalidado por cierre de sesion).
 *
 * Se ejecuta a nivel de filtro, antes de que la peticion llegue a los
 * controladores, por lo que no puede ser manejado por
 * {@code ManejadorGlobalExcepciones}. Aqui se construye manualmente una
 * respuesta 401 con el mismo formato ({@link RespuestaError}) que usa el
 * resto de la API, para mantener consistencia.
 */
@Component
public class PuntoEntradaJwt implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public PuntoEntradaJwt(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                        AuthenticationException authException) throws IOException, ServletException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        RespuestaError cuerpo = new RespuestaError(
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                "No autenticado. Inicie sesion nuevamente.",
                request.getRequestURI(),
                null
        );

        response.getWriter().write(objectMapper.writeValueAsString(cuerpo));
    }
}
