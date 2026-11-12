package com.transportes.reclamos.servicios;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.reclamos.dto.ProveedorDto;

@Component
public class DatosProveedor {

    private final ProveedorDto datos;

    public DatosProveedor(
            @Value("${libro.proveedor.razon-social:}") String razonSocial,
            @Value("${libro.proveedor.ruc:}") String ruc,
            @Value("${libro.proveedor.direccion:}") String direccion,
            @Value("${libro.proveedor.telefono:}") String telefono,
            @Value("${libro.proveedor.correo:}") String correo) {
        this.datos = new ProveedorDto(vacioANulo(razonSocial), vacioANulo(ruc), vacioANulo(direccion),
                vacioANulo(telefono), vacioANulo(correo));
    }

    public ProveedorDto obtener() {
        return datos;
    }

    private static String vacioANulo(String valor) {
        return valor == null || valor.isBlank() ? null : valor.strip();
    }
}
