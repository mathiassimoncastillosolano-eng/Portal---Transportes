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

/**
 * Controlador REST del mapa de asientos de un viaje: abrir sesión de reserva, ver asientos, bloquear y liberar, y
 * recibir cambios en vivo (SSE).
 */
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

    /** POST /{idViaje}/sesiones: abre una sesión de reserva (201 con el token y su vencimiento). */
    @PostMapping("/{idViaje}/sesiones")
    public ResponseEntity<SesionReservaResponseDTO> crearSesion(@PathVariable Long idViaje,
            @RequestParam(required = false) Integer minutos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(viajeAsientoServicio.crearSesion(idViaje, minutos));
    }

    /** POST /{idViaje}/sesiones/liberar: el cliente sale y se liberan todos sus asientos. */
    @PostMapping("/{idViaje}/sesiones/liberar")
    public ResponseEntity<Void> liberarSesion(@PathVariable Long idViaje,
            @RequestBody @Valid LiberarAsientoRequest request) {
        viajeAsientoServicio.liberarSesion(idViaje, request);
        return ResponseEntity.noContent().build();
    }

    /** GET /{idViaje}/asientos: mapa del bus por piso con el estado de cada asiento. */
    @GetMapping("/{idViaje}/asientos")
    public ResponseEntity<MapaAsientosViajeDTO> obtenerMapaAsientos(
            @PathVariable Long idViaje,
            @RequestParam(required = false) String tokenSesion) {
        return ResponseEntity.ok(viajeAsientoServicio.obtenerMapaAsientos(idViaje, tokenSesion));
    }

    /** GET /{idViaje}/asientos/eventos: conexión abierta (SSE) para recibir los cambios de asientos en vivo. */
    @GetMapping(value = "/{idViaje}/asientos/eventos", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suscribirEventos(@PathVariable Long idViaje) {
        return sseServicio.suscribir(idViaje);
    }

    /** POST .../bloquear: reserva un asiento para la sesión (409 si otro lo tomó antes). */
    @PostMapping("/{idViaje}/asientos/{idAsiento}/bloquear")
    public ResponseEntity<BloqueoAsientoResponseDTO> bloquearAsiento(
            @PathVariable Long idViaje, @PathVariable Integer idAsiento,
            @RequestBody @Valid BloqueoAsientoRequest request) {
        return ResponseEntity.ok(viajeAsientoServicio.bloquearAsiento(idViaje, idAsiento, request));
    }

    /** POST .../liberar: suelta un asiento propio. */
    @PostMapping("/{idViaje}/asientos/{idAsiento}/liberar")
    public ResponseEntity<Void> liberarAsiento(
            @PathVariable Long idViaje, @PathVariable Integer idAsiento,
            @RequestBody @Valid LiberarAsientoRequest request) {
        viajeAsientoServicio.liberarAsiento(idViaje, idAsiento, request);
        return ResponseEntity.noContent().build();
    }
}