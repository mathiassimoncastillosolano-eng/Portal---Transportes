package com.transportes.viajes.controladores;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.transportes.viajes.dto.BloqueoAsientoRequest;
import com.transportes.viajes.dto.BloqueoAsientoResponseDTO;
import com.transportes.viajes.dto.LiberarAsientoRequest;
import com.transportes.viajes.dto.MapaAsientosViajeDTO;
import com.transportes.viajes.dto.SesionReservaResponseDTO;
import com.transportes.viajes.servicios.AsientoSseServicio;
import com.transportes.viajes.servicios.ViajeAsientoServicio;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/viajes")
@CrossOrigin(origins = "http://localhost:5173")
public class ViajeAsientoControlador {

    private final ViajeAsientoServicio viajeAsientoServicio;
    private final AsientoSseServicio sseServicio;

    public ViajeAsientoControlador(ViajeAsientoServicio viajeAsientoServicio,
                                   AsientoSseServicio sseServicio) {
        this.viajeAsientoServicio = viajeAsientoServicio;
        this.sseServicio = sseServicio;
    }

    @PostMapping("/{idViaje}/sesiones")
    public ResponseEntity<SesionReservaResponseDTO> crearSesion(@PathVariable Long idViaje) {
        return ResponseEntity.status(HttpStatus.CREATED).body(viajeAsientoServicio.crearSesion(idViaje));
    }

    @GetMapping("/{idViaje}/asientos")
    public ResponseEntity<MapaAsientosViajeDTO> obtenerMapaAsientos(
            @PathVariable Long idViaje,
            @RequestParam(required = false) String tokenSesion) {
        return ResponseEntity.ok(viajeAsientoServicio.obtenerMapaAsientos(idViaje, tokenSesion));
    }

    @GetMapping(value = "/{idViaje}/asientos/eventos", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suscribirEventos(@PathVariable Long idViaje) {
        return sseServicio.suscribir(idViaje);
    }

    @PostMapping("/{idViaje}/asientos/{idAsiento}/bloquear")
    public ResponseEntity<BloqueoAsientoResponseDTO> bloquearAsiento(
            @PathVariable Long idViaje, @PathVariable Integer idAsiento,
            @RequestBody @Valid BloqueoAsientoRequest request) {
        return ResponseEntity.ok(viajeAsientoServicio.bloquearAsiento(idViaje, idAsiento, request));
    }

    @PostMapping("/{idViaje}/asientos/{idAsiento}/liberar")
    public ResponseEntity<Void> liberarAsiento(
            @PathVariable Long idViaje, @PathVariable Integer idAsiento,
            @RequestBody @Valid LiberarAsientoRequest request) {
        viajeAsientoServicio.liberarAsiento(idViaje, idAsiento, request);
        return ResponseEntity.noContent().build();
    }
}