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
 * Responde 401 cuando alguien entra a una ruta privada sin sesión válida (sin token, token inválido, vencido o
 * cerrado). Esto pasa en el filtro, antes de llegar a los controladores, así que el manejador global no lo atrapa;
 * por eso aquí se arma a mano el mismo formato RespuestaError.
 */
@Component
public class PuntoEntradaJwt implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public PuntoEntradaJwt(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Escribe la respuesta 401 en JSON. */
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
