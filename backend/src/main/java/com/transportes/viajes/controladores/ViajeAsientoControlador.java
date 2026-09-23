package com.transportes.viajes.controladores;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.viajes.dto.BloqueoAsientoRequest;
import com.transportes.viajes.dto.BloqueoAsientoResponseDTO;
import com.transportes.viajes.dto.LiberarAsientoRequest;
import com.transportes.viajes.dto.MapaAsientosViajeDTO;
import com.transportes.viajes.servicios.ViajeAsientoServicio;

@RestController
@RequestMapping("/api/viajes")
@CrossOrigin(origins = "http://localhost:5173")
public class ViajeAsientoControlador {

    private final ViajeAsientoServicio viajeAsientoServicio;

    public ViajeAsientoControlador(ViajeAsientoServicio viajeAsientoServicio) {
        this.viajeAsientoServicio = viajeAsientoServicio;
    }

    @GetMapping("/{idViaje}/asientos")
    public ResponseEntity<MapaAsientosViajeDTO> obtenerMapaAsientos(@PathVariable Long idViaje) {
        return ResponseEntity.ok(viajeAsientoServicio.obtenerMapaAsientos(idViaje));
    }

    @PostMapping("/{idViaje}/asientos/{idAsiento}/bloquear")
    public ResponseEntity<BloqueoAsientoResponseDTO> bloquearAsiento(
            @PathVariable Long idViaje, @PathVariable Integer idAsiento,
            @org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid BloqueoAsientoRequest request) {
        return ResponseEntity.ok(viajeAsientoServicio.bloquearAsiento(idViaje, idAsiento, request));
    }

    @PostMapping("/{idViaje}/asientos/{idAsiento}/liberar")
    public ResponseEntity<Void> liberarAsiento(
            @PathVariable Long idViaje, @PathVariable Integer idAsiento,
            @org.springframework.web.bind.annotation.RequestBody @jakarta.validation.Valid LiberarAsientoRequest request) {
        viajeAsientoServicio.liberarAsiento(idViaje, idAsiento, request);
        return ResponseEntity.noContent().build();
    }
}