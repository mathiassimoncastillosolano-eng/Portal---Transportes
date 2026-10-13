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

    private static final Logger log = LoggerFactory.getLogger(UsuarioController.class);

    private final UsuarioService usuarioService;
    private final CompraServicio compraServicio;

    public UsuarioController(UsuarioService usuarioService, CompraServicio compraServicio) {
        this.usuarioService = usuarioService;
        this.compraServicio = compraServicio;
    }

    @GetMapping("/perfil")
    public ResponseEntity<PerfilUsuarioResponse> obtenerPerfil(
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        PerfilUsuarioResponse perfil = usuarioService.obtenerPerfil(usuarioAutenticado.idUsuario());
        return ResponseEntity.ok(perfil.conEstadisticas(estadisticasDe(usuarioAutenticado.idUsuario())));
    }

    @PutMapping("/perfil")
    public ResponseEntity<PerfilUsuarioResponse> actualizarPerfil(
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
            @Valid @RequestBody ActualizarPerfilRequest datos) {
        PerfilUsuarioResponse perfil = usuarioService.actualizarPerfil(usuarioAutenticado.idUsuario(), datos);
        return ResponseEntity.ok(perfil.conEstadisticas(estadisticasDe(usuarioAutenticado.idUsuario())));
    }

    /**
     * Se calcula DESPUES de que termine la transaccion del servicio de usuarios, de modo que un fallo al contar
     * compras no puede abortar ni revertir la consulta/actualizacion del perfil ni impedir iniciar sesion. Si
     * falla se devuelve {@code null} (dato no disponible), nunca ceros inventados; el frontend consulta
     * ademas {@code GET /api/usuarios/perfil/resumen}, que si informa el error.
     */
    private EstadisticasUsuarioResponse estadisticasDe(Integer idUsuario) {
        try {
            return EstadisticasUsuarioResponse.de(compraServicio.resumen(idUsuario));
        } catch (DataAccessException excepcion) {
            log.warn("No se pudieron calcular las estadisticas del usuario {}: {}", idUsuario, excepcion.getMessage());
            return null;
        }
    }
}
