package com.transportes.viajes.servicios;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.viajes.dto.ConsultaDniResponseDTO;
import com.transportes.viajes.repositorios.PasajeroRepositorio;

/** Primero la base de datos; solo si el pasajero no existe se consulta la identidad externa. Solo lectura. */
@Service
public class ConsultaDniServicio {

    private static final String TIPO_DNI = "DNI";

    private final PasajeroRepositorio pasajeroRepositorio;
    private final ClienteDni clienteDni;

    public ConsultaDniServicio(PasajeroRepositorio pasajeroRepositorio, ClienteDni clienteDni) {
        this.pasajeroRepositorio = pasajeroRepositorio;
        this.clienteDni = clienteDni;
    }

    @Transactional(readOnly = true)
    public ConsultaDniResponseDTO consultar(String dni) {
        if (dni == null || !dni.matches("\\d{8}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El DNI debe tener 8 dígitos.");
        }
        return pasajeroRepositorio.findByTipoDocumentoAndNumeroDocumento(TIPO_DNI, dni)
                .map(p -> new ConsultaDniResponseDTO(dni, true, "BD",
                        p.getNombres(), p.getApellidos(), p.getFechaNacimiento(), p.getNroTelefono()))
                .orElseGet(() -> clienteDni.consultar(dni)
                        .map(d -> new ConsultaDniResponseDTO(dni, false, "APIPERU",
                                d.nombres(), d.apellidos(), null, null))
                        .orElseGet(() -> new ConsultaDniResponseDTO(dni, false, "MANUAL", null, null, null, null)));
    }
}
