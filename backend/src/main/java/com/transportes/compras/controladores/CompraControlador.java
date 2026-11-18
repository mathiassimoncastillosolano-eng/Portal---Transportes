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
 * Controlador REST de "Mis pasajes", historial y resumen del perfil (/api/usuarios/perfil). Exige sesión (JWT). El
 * id del usuario siempre se toma del token validado, nunca de la URL ni del cuerpo, así nadie puede ver compras
 * ajenas.
 */
@RestController
@RequestMapping("/api/usuarios/perfil")
public class CompraControlador {

    private final CompraServicio compras;

    public CompraControlador(CompraServicio compras) {
        this.compras = compras;
    }

    /** GET /resumen: contadores del perfil (pasajes, viajes completados, tickets, compras vigentes). */
    @GetMapping("/resumen")
    public ResumenPerfilDto resumen(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.resumen(idDe(usuario));
    }

    /** GET /pasajes: pantalla "Mis pasajes", con las compras vigentes primero. */
    @GetMapping("/pasajes")
    public ListaComprasDto pasajes(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.listar(idDe(usuario));
    }

    /** GET /pasajes/{idVenta}: detalle de una compra. 404 si no existe o es de otra cuenta. */
    @GetMapping("/pasajes/{idVenta}")
    public CompraDto detalle(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable int idVenta) {
        return compras.detalle(idDe(usuario), idVenta);
    }

    /** GET /historial: compras que ya no están vigentes, de la más reciente a la más antigua. */
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
