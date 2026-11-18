package com.transportes.reclamos.dto;

/** Datos de la empresa: razón social, RUC, dirección, teléfono y correo. */
public record ProveedorDto(String razonSocial, String ruc, String direccion, String telefono, String correo) {
}
