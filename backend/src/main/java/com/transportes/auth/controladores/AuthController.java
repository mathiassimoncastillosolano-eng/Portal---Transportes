package com.transportes.auth.controladores;

import com.transportes.auth.dto.GoogleLoginRequest;
import com.transportes.auth.dto.LoginEmpresarialResponse;
import com.transportes.auth.dto.LoginRequest;
import com.transportes.auth.dto.LoginResponse;
import com.transportes.auth.servicios.AuthService;
import com.transportes.auth.servicios.GoogleAuthService;
import com.transportes.security.servicios.UsuarioAutenticado;
import com.transportes.security.servicios.DetalleTokenJwt;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Recibe las peticiones de inicio y cierre de sesión y se las pasa a AuthService o GoogleAuthService. */
@RestController
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;

    public AuthController(AuthService authService, GoogleAuthService googleAuthService) {
        this.authService = authService;
        this.googleAuthService = googleAuthService;
    }

    /** Inicia sesión en el Portal con correo y contraseña. Devuelve el token (JWT) y los datos del usuario. */
    @PostMapping("/api/auth/login")
    public ResponseEntity<LoginResponse> iniciarSesion(@Valid @RequestBody LoginRequest datos) {
        return ResponseEntity.ok(authService.iniciarSesion(datos));
    }

    /** Inicia sesión en el Sistema Empresarial. Solo deja entrar a empleados; a un cliente le responde 403. */
    @PostMapping("/api/auth/login-empresarial")
    public ResponseEntity<LoginEmpresarialResponse> iniciarSesionEmpresarial(@Valid @RequestBody LoginRequest datos) {
        return ResponseEntity.ok(authService.iniciarSesionEmpresarial(datos));
    }

    /** Inicia sesión con Google. Si la cuenta no existe, la crea. */
    @PostMapping("/api/auth/google")
    public ResponseEntity<LoginResponse> iniciarSesionConGoogle(@Valid @RequestBody GoogleLoginRequest datos) {
        return ResponseEntity.ok(googleAuthService.iniciarSesion(datos.getCredential()));
    }

    /** Une una cuenta de Google al usuario que ya inició sesión. */
    @PostMapping("/api/auth/google/vincular")
    public ResponseEntity<Map<String, String>> vincularGoogle(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                                              @Valid @RequestBody GoogleLoginRequest datos) {
        googleAuthService.vincular(usuario.idUsuario(), datos.getCredential());
        return ResponseEntity.ok(Map.of("mensaje", "Cuenta de Google vinculada correctamente."));
    }

    /** Cierra la sesión: el token actual deja de servir. */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Map<String, String>> cerrarSesion(Authentication authentication) {
        if (authentication.getDetails() instanceof DetalleTokenJwt detalle) {
            authService.cerrarSesion(detalle.jti(), detalle.expiracion());
        }
        return ResponseEntity.ok(Map.of("mensaje", "Sesion cerrada correctamente."));
    }
}
