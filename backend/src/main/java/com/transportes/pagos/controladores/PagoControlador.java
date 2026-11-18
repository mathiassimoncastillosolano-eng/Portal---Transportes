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

/**
 * Controlador REST de pagos con Mercado Pago (/api/pagos). Exige sesión: la compra queda a nombre del usuario del
 * token.
 */
@RestController
@RequestMapping("/api/pagos")
public class PagoControlador {

    private final PagoServicio pagoServicio;
    private final AutorizadorEntornoPago autorizador;

    public PagoControlador(PagoServicio pagoServicio, AutorizadorEntornoPago autorizador) {
        this.pagoServicio = pagoServicio;
        this.autorizador = autorizador;
    }

    /**
     * GET /configuracion: entornos de pago que puede usar el usuario y su Public Key. Un comprador normal solo
     * recibe PRODUCTION.
     */
    @GetMapping("/configuracion")
    public ResponseEntity<ConfiguracionPagoResponse> configuracion(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return ResponseEntity.ok(autorizador.configuracionPara(usuario.idUsuario()));
    }

    /**
     * POST: inicia el pago (crea la operación y la order en Mercado Pago). Responde 200 si la solicitud es válida;
     * el resultado (APROBADO, RECHAZADO, EN_PROCESO...) va en el cuerpo. Repetir la misma claveIdempotencia
     * devuelve la misma operación (sin cobrar dos veces).
     */
    @PostMapping
    public ResponseEntity<EstadoPagoResponse> iniciar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestBody @Valid IniciarPagoRequest request) {
        return ResponseEntity.ok(pagoServicio.iniciar(usuario.idUsuario(), request));
    }

    /**
     * GET /{referencia}: estado del pago verificado por el backend. Si sigue pendiente, consulta a Mercado Pago.
     */
    @GetMapping("/{referencia}")
    public ResponseEntity<EstadoPagoResponse> consultar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable @Pattern(regexp = "^RL-[0-9a-f-]{36}$") String referencia) {
        return ResponseEntity.ok(pagoServicio.consultar(usuario.idUsuario(), referencia));
    }
}
