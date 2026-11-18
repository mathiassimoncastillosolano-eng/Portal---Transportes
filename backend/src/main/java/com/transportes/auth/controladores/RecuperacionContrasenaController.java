package com.transportes.auth.controladores;

import com.transportes.auth.dto.CompletarRecuperacionRequest;
import com.transportes.auth.dto.PruebaRecuperacionResponse;
import com.transportes.auth.dto.SolicitudRecuperacionRequest;
import com.transportes.auth.dto.SolicitudRecuperacionResponse;
import com.transportes.auth.dto.VerificarCodigoRequest;
import com.transportes.auth.servicios.RecuperacionContrasenaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoints publicos de recuperacion de contrasena (sin sesion previa).
 *
 * <p>La logica y las reglas de seguridad estan en {@link RecuperacionContrasenaService}.
 * Los errores se traducen a {@code RespuestaError} en el manejador global.</p>
 */
@RestController
@RequestMapping("/api/auth/password-reset")
public class RecuperacionContrasenaController {

    private final RecuperacionContrasenaService servicio;

    public RecuperacionContrasenaController(RecuperacionContrasenaService servicio) {
        this.servicio = servicio;
    }

    /**
     * Paso 1: envía un código de 6 dígitos al correo. Responde siempre igual para no revelar si el correo
     * existe.
     */
    @PostMapping("/request")
    public ResponseEntity<SolicitudRecuperacionResponse> solicitar(
            @Valid @RequestBody SolicitudRecuperacionRequest datos, HttpServletRequest request) {
        return ResponseEntity.ok(servicio.solicitarCodigo(datos.correo(), request.getRemoteAddr()));
    }

    /** Reenvía el código (respeta la espera mínima entre envíos). */
    @PostMapping("/resend")
    public ResponseEntity<SolicitudRecuperacionResponse> reenviar(
            @Valid @RequestBody SolicitudRecuperacionRequest datos, HttpServletRequest request) {
        return ResponseEntity.ok(servicio.solicitarCodigo(datos.correo(), request.getRemoteAddr()));
    }

    /** Paso 2: comprueba el código y devuelve una "prueba" firmada para el paso 3. */
    @PostMapping("/verify")
    public ResponseEntity<PruebaRecuperacionResponse> verificar(
            @Valid @RequestBody VerificarCodigoRequest datos, HttpServletRequest request) {
        return ResponseEntity.ok(servicio.verificarCodigo(datos.correo(), datos.codigo(), request.getRemoteAddr()));
    }

    /** Paso 3: con la prueba válida guarda la nueva contraseña (BCrypt). */
    @PostMapping("/complete")
    public ResponseEntity<Map<String, String>> completar(
            @Valid @RequestBody CompletarRecuperacionRequest datos, HttpServletRequest request) {
        servicio.completarRecuperacion(datos.pruebaRecuperacion(), datos.contrasena(),
                datos.confirmarContrasena(), request.getRemoteAddr());
        return ResponseEntity.ok(Map.of("mensaje", "Tu contraseña se cambió correctamente."));
    }
}
