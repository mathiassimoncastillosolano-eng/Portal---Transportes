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

/**
 * Controlador de sesión: login del Portal, login del Sistema Empresarial, login con Google, vincular Google y
 * logout.
 * Solo recibe la petición y llama a AuthService o GoogleAuthService. El registro de cuentas está en
 * RegistroUsuarioController.
 */
@RestController
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;

    public AuthController(AuthService authService, GoogleAuthService googleAuthService) {
        this.authService = authService;
        this.googleAuthService = googleAuthService;
    }

    /**
     * POST /api/auth/login (público). Correo y contraseña correctos -> 200 con el JWT y los datos básicos del
     * usuario.
     */
    @PostMapping("/api/auth/login")
    public ResponseEntity<LoginResponse> iniciarSesion(@Valid @RequestBody LoginRequest datos) {
        return ResponseEntity.ok(authService.iniciarSesion(datos));
    }

    /**
     * POST /api/auth/login-empresarial (público). Igual que el login del Portal, pero solo entrega token a quien
     * está en la tabla empleado (AGENCIA o GERENTE). Un cliente recibe 403.
     */
    @PostMapping("/api/auth/login-empresarial")
    public ResponseEntity<LoginEmpresarialResponse> iniciarSesionEmpresarial(@Valid @RequestBody LoginRequest datos) {
        return ResponseEntity.ok(authService.iniciarSesionEmpresarial(datos));
    }

    /**
     * POST /api/auth/google (público). Recibe el ID token de Google, lo valida y devuelve nuestro JWT. Si la
     * cuenta no existe, la crea.
     */
    @PostMapping("/api/auth/google")
    public ResponseEntity<LoginResponse> iniciarSesionConGoogle(@Valid @RequestBody GoogleLoginRequest datos) {
        return ResponseEntity.ok(googleAuthService.iniciarSesion(datos.getCredential()));
    }

    /**
     * POST /api/auth/google/vincular (requiere JWT). Une una cuenta de Google con el mismo correo al usuario que
     * ya inició sesión.
     */
    @PostMapping("/api/auth/google/vincular")
    public ResponseEntity<Map<String, String>> vincularGoogle(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                                              @Valid @RequestBody GoogleLoginRequest datos) {
        googleAuthService.vincular(usuario.idUsuario(), datos.getCredential());
        return ResponseEntity.ok(Map.of("mensaje", "Cuenta de Google vinculada correctamente."));
    }

    /**
     * POST /api/auth/logout (requiere JWT). Pone el token actual en la lista negra para que no se pueda volver a
     * usar.
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Map<String, String>> cerrarSesion(Authentication authentication) {
        if (authentication.getDetails() instanceof DetalleTokenJwt detalle) {
            authService.cerrarSesion(detalle.jti(), detalle.expiracion());
        }
        return ResponseEntity.ok(Map.of("mensaje", "Sesion cerrada correctamente."));
    }
}
