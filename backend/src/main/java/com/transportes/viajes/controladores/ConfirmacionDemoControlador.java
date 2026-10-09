package com.transportes.viajes.controladores;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.viajes.dto.BloqueoAsientoRequest;
import com.transportes.viajes.servicios.PasajerosSesionServicio;

import jakarta.validation.Valid;

/**
 * TEMPORAL: simula "pago exitoso" para probar el flujo completo. Solo existe si
 * reserva.confirmacion-demo=true. Se ELIMINA cuando la pasarela llame a confirmarSesion.
 */
@RestController
@RequestMapping("/api/viajes")
@ConditionalOnProperty(name = "reserva.confirmacion-demo", havingValue = "true")
public class ConfirmacionDemoControlador {

    private final PasajerosSesionServicio pasajerosSesionServicio;

    public ConfirmacionDemoControlador(PasajerosSesionServicio pasajerosSesionServicio) {
        this.pasajerosSesionServicio = pasajerosSesionServicio;
    }

    /**
     * Pago simulado aprobado: guarda en PostgreSQL los pasajeros de la caché de la sesión y pasa a OCUPADO
     * sus asientos, todo en una transacción. Devuelve los ids confirmados.
     */
    @PostMapping("/{idViaje}/confirmar-demo")
    public ResponseEntity<List<Integer>> confirmar(
            @PathVariable Long idViaje, @RequestBody @Valid BloqueoAsientoRequest request) {
        return ResponseEntity.ok(pasajerosSesionServicio.confirmarCompra(idViaje, request.tokenSesion()));
    }
}
