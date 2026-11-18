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

/** Recibe las peticiones para recuperar la contraseña y se las pasa a RecuperacionContrasenaService. */
@RestController
@RequestMapping("/api/auth/password-reset")
public class RecuperacionContrasenaController {

    private final RecuperacionContrasenaService servicio;

    public RecuperacionContrasenaController(RecuperacionContrasenaService servicio) {
        this.servicio = servicio;
    }

    /** Envía un código de 6 dígitos al correo. Responde lo mismo exista o no la cuenta. */
    @PostMapping("/request")
    public ResponseEntity<SolicitudRecuperacionResponse> solicitar(
            @Valid @RequestBody SolicitudRecuperacionRequest datos, HttpServletRequest request) {
        return ResponseEntity.ok(servicio.solicitarCodigo(datos.correo(), request.getRemoteAddr()));
    }

    /** Reenviar el código (hay que esperar un mínimo entre envíos). */
    @PostMapping("/resend")
    public ResponseEntity<SolicitudRecuperacionResponse> reenviar(
            @Valid @RequestBody SolicitudRecuperacionRequest datos, HttpServletRequest request) {
        return ResponseEntity.ok(servicio.solicitarCodigo(datos.correo(), request.getRemoteAddr()));
    }

    /** Revisa el código. Si es correcto, devuelve una prueba firmada para cambiar la contraseña. */
    @PostMapping("/verify")
    public ResponseEntity<PruebaRecuperacionResponse> verificar(
            @Valid @RequestBody VerificarCodigoRequest datos, HttpServletRequest request) {
        return ResponseEntity.ok(servicio.verificarCodigo(datos.correo(), datos.codigo(), request.getRemoteAddr()));
    }

    /** Guarda la nueva contraseña si la prueba es válida. */
    @PostMapping("/complete")
    public ResponseEntity<Map<String, String>> completar(
            @Valid @RequestBody CompletarRecuperacionRequest datos, HttpServletRequest request) {
        servicio.completarRecuperacion(datos.pruebaRecuperacion(), datos.contrasena(),
                datos.confirmarContrasena(), request.getRemoteAddr());
        return ResponseEntity.ok(Map.of("mensaje", "Tu contraseña se cambió correctamente."));
    }
}
