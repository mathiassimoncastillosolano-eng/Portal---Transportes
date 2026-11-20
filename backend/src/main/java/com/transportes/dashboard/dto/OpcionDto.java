package com.transportes.dashboard.dto;

/** Una opción de un filtro: su id, el texto a mostrar y un detalle opcional (por ejemplo la ciudad). */
public record OpcionDto(String id, String nombre, String detalle) {
}
