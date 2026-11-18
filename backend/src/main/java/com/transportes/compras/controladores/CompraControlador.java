package com.transportes.compras.controladores;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.CompraDto;
import com.transportes.compras.dto.ListaComprasDto;
import com.transportes.compras.dto.ResumenPerfilDto;
import com.transportes.compras.servicios.CompraServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

/**
 * Recibe las peticiones de "Mis pasajes", historial y resumen del perfil. Usa siempre el id del usuario que viene
 * en el token.
 */
@RestController
@RequestMapping("/api/usuarios/perfil")
public class CompraControlador {

    private final CompraServicio compras;

    public CompraControlador(CompraServicio compras) {
        this.compras = compras;
    }

    /** Devuelve los contadores del perfil. */
    @GetMapping("/resumen")
    public ResumenPerfilDto resumen(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.resumen(idDe(usuario));
    }

    /** Devuelve las compras del usuario, primero las vigentes. */
    @GetMapping("/pasajes")
    public ListaComprasDto pasajes(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.listar(idDe(usuario));
    }

    /** Devuelve el detalle de una compra del usuario. */
    @GetMapping("/pasajes/{idVenta}")
    public CompraDto detalle(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable int idVenta) {
        return compras.detalle(idDe(usuario), idVenta);
    }

    /** Devuelve las compras que ya no están vigentes. */
    @GetMapping("/historial")
    public List<CompraDto> historial(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.historial(idDe(usuario));
    }

    /**
     * Saca el id del usuario del token. Si no hay sesión responde 401 (la seguridad ya lo filtra antes; esto es
     * una segunda barrera).
     */
    private static int idDe(UsuarioAutenticado usuario) {
        if (usuario == null || usuario.idUsuario() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado. Inicie sesion nuevamente.");
        }
        return usuario.idUsuario();
    }
}
