package com.transportes.reclamos.dto;

/** Respuesta al registrar: el token para consultar después y la constancia. */
public record RegistroReclamoRespuesta(String tokenConsulta, ConstanciaReclamoDto constancia) {
}
