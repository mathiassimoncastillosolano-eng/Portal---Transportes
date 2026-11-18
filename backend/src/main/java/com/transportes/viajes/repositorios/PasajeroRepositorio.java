package com.transportes.viajes.repositorios;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.viajes.entidades.Pasajero;

/** Acceso a la tabla pasajero. */
public interface PasajeroRepositorio extends JpaRepository<Pasajero, Integer> {

    /** Reutiliza el pasajero si ya existe con ese documento. */
    Optional<Pasajero> findByTipoDocumentoAndNumeroDocumento(String tipoDocumento, String numeroDocumento);
}
