package com.transportes.viajes.controladores;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.viajes.dto.ConsultaDniResponseDTO;
import com.transportes.viajes.servicios.ConsultaDniServicio;

@RestController
@RequestMapping("/api/pasajeros")
public class ConsultaDniControlador {

    private final ConsultaDniServicio consultaDniServicio;

    public ConsultaDniControlador(ConsultaDniServicio consultaDniServicio) {
        this.consultaDniServicio = consultaDniServicio;
    }

    /** Exige JWT (ver ConfiguracionSeguridad): devuelve datos personales de pasajeros registrados. */
    @GetMapping("/dni/{dni}")
    public ResponseEntity<ConsultaDniResponseDTO> consultarDni(@PathVariable String dni) {
        return ResponseEntity.ok(consultaDniServicio.consultar(dni));
    }
}
