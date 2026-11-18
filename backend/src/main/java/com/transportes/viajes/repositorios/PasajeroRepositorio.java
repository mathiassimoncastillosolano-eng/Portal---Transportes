package com.transportes.viajes.repositorios;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.viajes.entidades.Pasajero;

/** Repositorio de la tabla pasajero. */
public interface PasajeroRepositorio extends JpaRepository<Pasajero, Integer> {

    /** Busca un pasajero por su documento, para reutilizarlo si ya existe. */
    Optional<Pasajero> findByTipoDocumentoAndNumeroDocumento(String tipoDocumento, String numeroDocumento);
}
