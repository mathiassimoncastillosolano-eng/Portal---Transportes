package com.transportes.usuarios.controladores;

import com.transportes.compras.servicios.CompraServicio;
import com.transportes.security.servicios.UsuarioAutenticado;
import com.transportes.usuarios.dto.ActualizarPerfilRequest;
import com.transportes.usuarios.dto.EstadisticasUsuarioResponse;
import com.transportes.usuarios.dto.PerfilUsuarioResponse;
import com.transportes.usuarios.servicios.UsuarioService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Recibe las peticiones del perfil del usuario. */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private static final Logger log = LoggerFactory.getLogger(UsuarioController.class);

    private final UsuarioService usuarioService;
    private final CompraServicio compraServicio;

    public UsuarioController(UsuarioService usuarioService, CompraServicio compraServicio) {
        this.usuarioService = usuarioService;
        this.compraServicio = compraServicio;
    }

    /** Devuelve los datos del perfil. */
    @GetMapping("/perfil")
    public ResponseEntity<PerfilUsuarioResponse> obtenerPerfil(
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        PerfilUsuarioResponse perfil = usuarioService.obtenerPerfil(usuarioAutenticado.idUsuario());
        return ResponseEntity.ok(perfil.conEstadisticas(estadisticasDe(usuarioAutenticado.idUsuario())));
    }

    /** Actualiza nombres, apellidos y teléfono. */
    @PutMapping("/perfil")
    public ResponseEntity<PerfilUsuarioResponse> actualizarPerfil(
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
            @Valid @RequestBody ActualizarPerfilRequest datos) {
        PerfilUsuarioResponse perfil = usuarioService.actualizarPerfil(usuarioAutenticado.idUsuario(), datos);
        return ResponseEntity.ok(perfil.conEstadisticas(estadisticasDe(usuarioAutenticado.idUsuario())));
    }

    /** Calcula los contadores del perfil. Si falla, devuelve null. */
    private EstadisticasUsuarioResponse estadisticasDe(Integer idUsuario) {
        try {
            return EstadisticasUsuarioResponse.de(compraServicio.resumen(idUsuario));
        } catch (DataAccessException excepcion) {
            log.warn("No se pudieron calcular las estadisticas del usuario {}: {}", idUsuario, excepcion.getMessage());
            return null;
        }
    }
}
