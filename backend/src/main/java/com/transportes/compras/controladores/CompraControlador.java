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
 * Compras, boletos e historial del usuario autenticado, bajo {@code /api/usuarios/perfil}.
 *
 * <p>Ese prefijo ya exige JWT en ConfiguracionSeguridad ({@code /api/usuarios/**} → authenticated), igual que
 * {@code GET/PUT /api/usuarios/perfil}. El id del usuario sale SIEMPRE del principal validado por
 * FiltroAutenticacionJwt; ninguna ruta, parámetro o cuerpo lo acepta desde el cliente.
 */
@RestController
@RequestMapping("/api/usuarios/perfil")
public class CompraControlador {

    private final CompraServicio compras;

    public CompraControlador(CompraServicio compras) {
        this.compras = compras;
    }

    @GetMapping("/resumen")
    public ResumenPerfilDto resumen(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.resumen(idDe(usuario));
    }

    @GetMapping("/pasajes")
    public ListaComprasDto pasajes(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.listar(idDe(usuario));
    }

    @GetMapping("/pasajes/{idVenta}")
    public CompraDto detalle(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable int idVenta) {
        return compras.detalle(idDe(usuario), idVenta);
    }

    @GetMapping("/historial")
    public List<CompraDto> historial(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return compras.historial(idDe(usuario));
    }

    /** Defensa en profundidad: la cadena de seguridad ya rechaza peticiones sin autenticar con 401. */
    private static int idDe(UsuarioAutenticado usuario) {
        if (usuario == null || usuario.idUsuario() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado. Inicie sesion nuevamente.");
        }
        return usuario.idUsuario();
    }
}
