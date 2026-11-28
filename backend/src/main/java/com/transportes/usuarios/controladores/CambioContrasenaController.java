package com.transportes.usuarios.controladores;

import com.transportes.security.servicios.UsuarioAutenticado;
import com.transportes.usuarios.dto.CambiarContrasenaRequest;
import com.transportes.usuarios.servicios.CambioContrasenaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * PUT /api/usuarios/contrasena: cambia la contraseña del usuario con sesión iniciada.
 * La regla de seguridad existente ya exige JWT para /api/usuarios/**.
 */
@RestController
@RequestMapping("/api/usuarios")
public class CambioContrasenaController {

    private final CambioContrasenaService cambioContrasenaService;

    public CambioContrasenaController(CambioContrasenaService cambioContrasenaService) {
        this.cambioContrasenaService = cambioContrasenaService;
    }

    @PutMapping("/contrasena")
    public ResponseEntity<Void> cambiar(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                        @Valid @RequestBody CambiarContrasenaRequest datos) {
        cambioContrasenaService.cambiar(usuarioAutenticado.idUsuario(), datos);
        return ResponseEntity.noContent().build();
    }
}
