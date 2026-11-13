package com.transportes.postergacion.controladores;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.servicios.PostergacionServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

/**
 * HU-02 · Cambio de pasaje.
 *
 * <p>Va bajo {@code /api/usuarios/**}, que ya exige sesión (JWT) en ConfiguracionSeguridad. El id del usuario
 * sale SIEMPRE del token; nunca se recibe desde el navegador.</p>
 */
@RestController
@RequestMapping("/api/usuarios/postergaciones")
public class PostergacionControlador {

    private final PostergacionServicio postergaciones;

    public PostergacionControlador(PostergacionServicio postergaciones) {
        this.postergaciones = postergaciones;
    }

    /** Ejemplo: GET /api/usuarios/postergaciones/26/viajes?origen=Trujillo&destino=Lima&fecha=2026-11-20 */
    @GetMapping("/{idPasaje}/viajes")
    public ConsultaPostergacionDto viajes(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                         @PathVariable int idPasaje,
                                         @RequestParam String origen,
                                         @RequestParam String destino,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return postergaciones.consultarViajes(idDe(usuario), idPasaje, origen, destino, fecha);
    }

    private static int idDe(UsuarioAutenticado usuario) {
        if (usuario == null || usuario.idUsuario() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado. Inicie sesion nuevamente.");
        }
        return usuario.idUsuario();
    }
}
