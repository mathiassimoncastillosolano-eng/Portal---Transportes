package com.transportes.pagos.controladores;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.pagos.dto.Confirmar3dsRequest;
import com.transportes.pagos.dto.ConfiguracionPagoResponse;
import com.transportes.pagos.dto.EstadoPagoResponse;
import com.transportes.pagos.dto.IniciarPagoRequest;
import com.transportes.pagos.servicios.PagoServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/pagos")
public class PagoControlador {

    private static final String REFERENCIA = "^RL-[0-9a-f-]{36}$";

    private final PagoServicio pagoServicio;

    public PagoControlador(PagoServicio pagoServicio) {
        this.pagoServicio = pagoServicio;
    }

    @GetMapping("/configuracion")
    public ResponseEntity<ConfiguracionPagoResponse> configuracion() {
        return ResponseEntity.ok(pagoServicio.configuracion());
    }

    @PostMapping
    public ResponseEntity<EstadoPagoResponse> iniciar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestBody @Valid IniciarPagoRequest request) {
        return ResponseEntity.ok(pagoServicio.iniciar(usuario.idUsuario(), request));
    }

    @PostMapping("/{referencia}/3ds")
    public ResponseEntity<EstadoPagoResponse> confirmar3ds(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable @Pattern(regexp = REFERENCIA) String referencia,
            @RequestBody @Valid Confirmar3dsRequest request) {
        return ResponseEntity.ok(pagoServicio.confirmar3ds(usuario.idUsuario(), referencia, request));
    }

    @GetMapping("/{referencia}")
    public ResponseEntity<EstadoPagoResponse> consultar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable @Pattern(regexp = REFERENCIA) String referencia) {
        return ResponseEntity.ok(pagoServicio.consultar(usuario.idUsuario(), referencia));
    }
}
