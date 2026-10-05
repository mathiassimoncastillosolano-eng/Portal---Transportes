package com.transportes.viajes.servicios;

import com.transportes.viajes.dto.ViajeResumenDto;
import com.transportes.viajes.repositorios.ViajeRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ViajeService {
    private final ViajeRepository viajes;
    public ViajeService(ViajeRepository viajes) { this.viajes = viajes; }

    @Transactional(readOnly = true)
    public List<ViajeResumenDto> buscar(String origen, String destino, LocalDate fecha, String horario) {
        if (origen == null || origen.isBlank() || destino == null || destino.isBlank() || fecha == null) {
            throw invalido("Origen, destino y fecha son obligatorios.");
        }
        origen = origen.trim();
        destino = destino.trim();
        if (origen.equalsIgnoreCase(destino)) throw invalido("El origen y el destino deben ser distintos.");
        String franja = horario == null ? "cualquiera" : horario.trim().toLowerCase(Locale.ROOT);
        int[] horas = switch (franja) {
            case "cualquiera", "" -> new int[]{0, 24};
            case "madrugada" -> new int[]{0, 6};
            case "mañana", "manana" -> new int[]{6, 12};
            case "tarde" -> new int[]{12, 19};
            case "noche" -> new int[]{19, 24};
            default -> throw invalido("Horario no válido. Usa madrugada, mañana, tarde, noche o cualquiera.");
        };
        return viajes.buscar(origen, destino, fecha, horas[0], horas[1]);
    }

    private ResponseStatusException invalido(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
    }
}
