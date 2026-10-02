package com.transportes.auth.controladores;

import com.transportes.auth.dto.GoogleLoginRequest;
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
 * Endpoints de autenticacion: inicio y cierre de sesion.
 *
 * El registro con correo y contrasena esta en {@code RegistroUsuarioController};
 * el inicio de sesion con Google (que crea la cuenta si no existe) esta aqui.
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
     * Endpoint publico. Recibe correo y contrasena, y devuelve un JWT junto
     * con los datos minimos del usuario si las credenciales son correctas.
     */
    @PostMapping("/api/auth/login")
    public ResponseEntity<LoginResponse> iniciarSesion(@Valid @RequestBody LoginRequest datos) {
        return ResponseEntity.ok(authService.iniciarSesion(datos));
    }

    /**
     * Endpoint publico. Recibe el ID token de Google, lo valida en el
     * servidor y devuelve el mismo JWT del login tradicional. Si el usuario
     * no existe, se crea la cuenta.
     */
    @PostMapping("/api/auth/google")
    public ResponseEntity<LoginResponse> iniciarSesionConGoogle(@Valid @RequestBody GoogleLoginRequest datos) {
        return ResponseEntity.ok(googleAuthService.iniciarSesion(datos.getCredential()));
    }

    /**
     * Endpoint protegido: asocia una cuenta de Google (mismo correo) al
     * usuario autenticado, para que pueda entrar tambien con Google.
     */
    @PostMapping("/api/auth/google/vincular")
    public ResponseEntity<Map<String, String>> vincularGoogle(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                                              @Valid @RequestBody GoogleLoginRequest datos) {
        googleAuthService.vincular(usuario.idUsuario(), datos.getCredential());
        return ResponseEntity.ok(Map.of("mensaje", "Cuenta de Google vinculada correctamente."));
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
