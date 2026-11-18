package com.transportes.buses.servicios;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.transportes.buses.dto.AsientoFisicoDTO;
import com.transportes.buses.entidades.Asiento;
import com.transportes.buses.repositorios.AsientoRepositorio;

/**
 * Lógica de los asientos físicos. En la base el número viene junto ("1A"), así que aquí se separa con una
 * expresión regular en fila (1) y letra (A) y se calcula el lado (A y B izquierda, C y D derecha).
 */
@Service
public class AsientoServicio {

    private static final Logger log = LoggerFactory.getLogger(AsientoServicio.class);
    private static final Pattern PATRON_NUMERO_ASIENTO = Pattern.compile("^(\\d+)([A-Za-z]+)$");

    private final AsientoRepositorio asientoRepositorio;

    public AsientoServicio(AsientoRepositorio asientoRepositorio) {
        this.asientoRepositorio = asientoRepositorio;
    }

    /**
     * Asientos del bus en un mapa por id. Lo usa ViajeAsientoServicio para juntar la posición con el estado de
     * cada asiento en un viaje.
     */
    public Map<Integer, AsientoFisicoDTO> mapaAsientosFisicosPorId(Integer idBus) {
        List<Asiento> asientos = asientoRepositorio.findByIdBusOrderByPisoAscNumeroAsientoAsc(idBus);
        Map<Integer, AsientoFisicoDTO> mapa = new java.util.LinkedHashMap<>();
        for (Asiento asiento : asientos) {
            AsientoFisicoDTO dto = mapearADto(asiento);
            if (dto != null) {
                mapa.put(asiento.getIdAsiento(), dto);
            }
        }
        return mapa;
    }
    
    /** Busca un asiento físico por su id. Si no existe, lanza error. */
    public AsientoFisicoDTO obtenerPorId(Integer idAsiento) {
        Asiento asiento = asientoRepositorio.findById(idAsiento)
            .orElseThrow(() -> new IllegalArgumentException("Asiento no encontrado: " + idAsiento));
        return mapearADto(asiento);
    }

    /** Lista los asientos del bus convertidos a DTO, ordenados por piso y número. */
    public List<AsientoFisicoDTO> listarAsientosPorBus(Integer idBus) {
    List<Asiento> asientos = asientoRepositorio.findByIdBusOrderByPisoAscNumeroAsientoAsc(idBus);

    return asientos.stream()
            .map(this::mapearADto)
            .filter(dto -> dto != null)
            .sorted(
                    java.util.Comparator.comparing(AsientoFisicoDTO::piso)
                            .thenComparing(AsientoFisicoDTO::fila)
                            .thenComparing(AsientoFisicoDTO::letra)
            )
            .toList();
    }

    private AsientoFisicoDTO mapearADto(Asiento asiento) {
        Matcher matcher = PATRON_NUMERO_ASIENTO.matcher(asiento.getNumeroAsiento());

        if (!matcher.matches()) {
            // Si un número de asiento no tiene el formato "1A", se salta ese asiento (no se rompe toda la
            // respuesta) y se deja un aviso en el log para corregir el dato.
            log.warn("numero_asiento con formato inesperado, id_asiento={}, valor='{}'",
                    asiento.getIdAsiento(), asiento.getNumeroAsiento());
            return null;
        }

        int fila = Integer.parseInt(matcher.group(1));
        String letra = matcher.group(2).toUpperCase();
        String lado = calcularLado(letra);

        return new AsientoFisicoDTO(
                asiento.getNumeroAsiento(),
                fila,
                letra,
                lado,
                asiento.getPiso()
        );
    }

    private String calcularLado(String letra) {
        return switch (letra) {
            case "A", "B" -> "izquierda";
            case "C", "D" -> "derecha";
            default -> {
                log.warn("Letra de asiento fuera de convención A/B/C/D: '{}'", letra);
                yield "izquierda"; // por si llega una letra desconocida
            }
        };
    }
}