package com.transportes.postergacion.controladores;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.dto.ConfirmarPostergacionRequest;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.servicios.ConfirmacionPostergacionServicio;
import com.transportes.postergacion.servicios.PostergacionServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

import jakarta.validation.Valid;

/** Recibe las peticiones para cambiar la fecha de un pasaje. */
@RestController
@RequestMapping("/api/usuarios/postergaciones")
public class PostergacionControlador {

    private final PostergacionServicio postergaciones;
    private final ConfirmacionPostergacionServicio confirmaciones;

    public PostergacionControlador(PostergacionServicio postergaciones,
                                   ConfirmacionPostergacionServicio confirmaciones) {
        this.postergaciones = postergaciones;
        this.confirmaciones = confirmaciones;
    }

    /** Devuelve los viajes a los que se puede cambiar el pasaje. */
    @GetMapping("/{idPasaje}/viajes")
    public ConsultaPostergacionDto viajes(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                         @PathVariable int idPasaje,
                                         @RequestParam String origen,
                                         @RequestParam String destino,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return postergaciones.consultarViajes(idDe(usuario), idPasaje, origen, destino, fecha);
    }

    /** Confirma el cambio del pasaje al nuevo viaje y asiento. */
    @PostMapping("/{idPasaje}/confirmar")
    public ConfirmacionPostergacionDto confirmar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                                 @PathVariable int idPasaje,
                                                 @Valid @RequestBody ConfirmarPostergacionRequest solicitud) {
        return confirmaciones.confirmar(idDe(usuario), idPasaje, solicitud);
    }

    private static int idDe(UsuarioAutenticado usuario) {
        if (usuario == null || usuario.idUsuario() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado. Inicie sesion nuevamente.");
        }
        return usuario.idUsuario();
    }
}
