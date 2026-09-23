package com.transportes.viajes.repositorios;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.viajes.entidades.Pasajero;

public interface PasajeroRepositorio extends JpaRepository<Pasajero, Integer> {

    Optional<Pasajero> findByTipoDocumentoAndNumeroDocumento(String tipoDocumento, String numeroDocumento);
}