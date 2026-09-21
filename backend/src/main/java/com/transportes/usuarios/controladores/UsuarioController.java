package com.transportes.usuarios.controladores;

import com.transportes.security.servicios.UsuarioAutenticado;
import com.transportes.usuarios.dto.ActualizarPerfilRequest;
import com.transportes.usuarios.dto.PerfilUsuarioResponse;
import com.transportes.usuarios.servicios.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints del perfil del usuario autenticado.
 *
 * El identificador del usuario NUNCA se recibe desde el frontend (ni por
 * parametro, ni por cuerpo de la peticion): siempre se obtiene a partir del
 * JWT ya validado por {@code FiltroAutenticacionJwt}, a traves del
 * principal de seguridad inyectado con {@code @AuthenticationPrincipal}.
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/perfil")
    public ResponseEntity<PerfilUsuarioResponse> obtenerPerfil(
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return ResponseEntity.ok(usuarioService.obtenerPerfil(usuarioAutenticado.idUsuario()));
    }

    @PutMapping("/perfil")
    public ResponseEntity<PerfilUsuarioResponse> actualizarPerfil(
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
            @Valid @RequestBody ActualizarPerfilRequest datos) {
        return ResponseEntity.ok(usuarioService.actualizarPerfil(usuarioAutenticado.idUsuario(), datos));
    }
}
