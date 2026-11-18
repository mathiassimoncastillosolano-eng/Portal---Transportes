package com.transportes.reclamos.dto;

/** Respuesta al registrar: token de consulta y constancia. */
public record RegistroReclamoRespuesta(String tokenConsulta, ConstanciaReclamoDto constancia) {
}
