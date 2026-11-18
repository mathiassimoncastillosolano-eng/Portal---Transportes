package com.transportes.viajes.servicios;

import java.util.Optional;

/** Consulta externa de identidad por DNI (hoy ApiPeru). Nunca lanza errores: si no hay datos devuelve vacío. */
public interface ClienteDni {

    Optional<DatosDni> consultar(String dni);

    record DatosDni(String nombres, String apellidos) {
    }
}
