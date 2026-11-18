package com.transportes.pagos.controladores;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.pagos.configuracion.AutorizadorEntornoPago;
import com.transportes.pagos.dto.ConfiguracionPagoResponse;
import com.transportes.pagos.dto.EstadoPagoResponse;
import com.transportes.pagos.dto.IniciarPagoRequest;
import com.transportes.pagos.servicios.PagoServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

/** Recibe las peticiones de pago con Mercado Pago. */
@RestController
@RequestMapping("/api/pagos")


public class PagoControlador {

    private final PagoServicio pagoServicio;   /* Logica de las operaciones de pago */
    private final AutorizadorEntornoPago autorizador;    /* acceso */

    public PagoControlador(PagoServicio pagoServicio, AutorizadorEntornoPago autorizador) {
        this.pagoServicio = pagoServicio;
        this.autorizador = autorizador;
    }

    /** Devuelve los entornos de pago que puede usar el usuario. */
    @GetMapping("/configuracion")
    public ResponseEntity<ConfiguracionPagoResponse> configuracion(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return ResponseEntity.ok(autorizador.configuracionPara(usuario.idUsuario()));
    }

    /** Inicia el pago con Mercado Pago y devuelve su estado. */
    @PostMapping
    public ResponseEntity<EstadoPagoResponse> iniciar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestBody @Valid IniciarPagoRequest request) {
        return ResponseEntity.ok(pagoServicio.iniciar(usuario.idUsuario(), request));
    }

    /** Devuelve el estado actual de un pago. */
    @GetMapping("/{referencia}")
    public ResponseEntity<EstadoPagoResponse> consultar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable @Pattern(regexp = "^RL-[0-9a-f-]{36}$") String referencia) {
        return ResponseEntity.ok(pagoServicio.consultar(usuario.idUsuario(), referencia));
    }
}
