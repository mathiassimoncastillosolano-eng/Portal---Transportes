package com.transportes.viajes.repositorios;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.viajes.entidades.Viaje;

/** Acceso JPA a la tabla viaje (buscar un viaje por id). */
public interface ViajeRepositorio extends JpaRepository<Viaje, Long> {
}