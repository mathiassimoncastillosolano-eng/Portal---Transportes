package com.transportes.auth.controladores;

import com.transportes.auth.dto.LoginRequest;
import com.transportes.auth.dto.LoginResponse;
import com.transportes.auth.servicios.AuthService;
import com.transportes.security.servicios.DetalleTokenJwt;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoints de autenticacion: inicio y cierre de sesion.
 *
 * Deliberadamente NO expone ningun endpoint de registro
 * (POST /registro, /crear-cuenta, /usuarios, etc.): los usuarios se
 * insertan manualmente en la base de datos, segun el alcance definido para
 * esta implementacion.
 */
@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Endpoint publico. Recibe correo y contrasena, y devuelve un JWT junto
     * con los datos minimos del usuario si las credenciales son correctas.
     */
    @PostMapping("/api/auth/login")
    public ResponseEntity<LoginResponse> iniciarSesion(@Valid @RequestBody LoginRequest datos) {
        return ResponseEntity.ok(authService.iniciarSesion(datos));
    }

    /**
     * Endpoint protegido: requiere un JWT valido. Invalida ese token
     * especifico agregandolo a la lista de tokens invalidados, para que no
     * pueda reutilizarse en solicitudes posteriores.
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Map<String, String>> cerrarSesion(Authentication authentication) {
        if (authentication.getDetails() instanceof DetalleTokenJwt detalle) {
            authService.cerrarSesion(detalle.jti(), detalle.expiracion());
        }
        return ResponseEntity.ok(Map.of("mensaje", "Sesion cerrada correctamente."));
    }
}
