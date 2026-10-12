package com.transportes.pagos.controladores;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.pagos.dto.EstadoPagoResponse;
import com.transportes.pagos.dto.IniciarPagoRequest;
import com.transportes.pagos.servicios.PagoServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

/**
 * Pagos con Mercado Pago. Requiere JWT: la venta queda asociada al usuario
 * autenticado.
 */
@RestController
@RequestMapping("/api/pagos")
public class PagoControlador {

    private final PagoServicio pagoServicio;

    public PagoControlador(PagoServicio pagoServicio) {
        this.pagoServicio = pagoServicio;
    }

    /**
     * Crea la operación y la order. 200 siempre que la solicitud sea válida: el
     * resultado (APROBADO, RECHAZADO,
     * EN_PROCESO, ACCION_REQUERIDA...) va en el cuerpo. Repetir la misma
     * claveIdempotencia devuelve la misma operación.
     */
    @PostMapping
    public ResponseEntity<EstadoPagoResponse> iniciar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestBody @Valid IniciarPagoRequest request) {
        return ResponseEntity.ok(pagoServicio.iniciar(usuario.idUsuario(), request));
    }

    /**
     * Estado verificado por el backend (consulta a Mercado Pago si la operación
     * sigue pendiente).
     */
    @GetMapping("/{referencia}")
    public ResponseEntity<EstadoPagoResponse> consultar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable @Pattern(regexp = "^RL-[0-9a-f-]{36}$") String referencia) {
        return ResponseEntity.ok(pagoServicio.consultar(usuario.idUsuario(), referencia));
    }
}
