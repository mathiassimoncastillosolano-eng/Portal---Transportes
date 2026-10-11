package com.transportes.pagos.servicios;

import java.util.List;

import org.springframework.stereotype.Component;

import com.transportes.viajes.dto.PasajeroAsientoRequest;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Serializa la copia temporal de pasajeros que acompaña a una operación de pago pendiente. */
@Component
public class DatosPasajerosJson {

    private static final TypeReference<List<PasajeroAsientoRequest>> TIPO = new TypeReference<>() {
    };

    private final ObjectMapper json;

    public DatosPasajerosJson(ObjectMapper json) {
        this.json = json;
    }

    public String escribir(List<PasajeroAsientoRequest> pasajeros) {
        return json.writeValueAsString(pasajeros);
    }

    public List<PasajeroAsientoRequest> leer(String texto) {
        if (texto == null || texto.isBlank()) {
            return List.of();
        }
        return json.readValue(texto, TIPO);
    }
}
