package com.transportes.pasajes.dto;

import java.util.List;

public record OpcionesFiltroPasajesDto(List<String> origenes, List<String> destinos) {
}
