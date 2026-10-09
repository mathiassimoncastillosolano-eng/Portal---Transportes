package com.transportes.viajes.controladores;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.viajes.dto.GuardarPasajerosRequest;
import com.transportes.viajes.dto.ResultadoPasajerosDTO;
import com.transportes.viajes.servicios.PasajerosSesionServicio;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/viajes")
@CrossOrigin(origins = "http://localhost:5173")
public class PasajeroControlador {

    private final PasajerosSesionServicio pasajerosSesionServicio;

    public PasajeroControlador(PasajerosSesionServicio pasajerosSesionServicio) {
        this.pasajerosSesionServicio = pasajerosSesionServicio;
    }

    /** 200 con sesión válida: valido=true (datos en caché temporal, NO en la BD) o valido=false con errores por campo. */
    @PostMapping("/{idViaje}/pasajeros")
    public ResponseEntity<ResultadoPasajerosDTO> guardarPasajeros(
            @PathVariable Long idViaje, @RequestBody @Valid GuardarPasajerosRequest request) {
        return ResponseEntity.ok(pasajerosSesionServicio.guardar(idViaje, request));
    }
}