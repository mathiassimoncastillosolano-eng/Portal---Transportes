package com.transportes.viajes.repositorios;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.viajes.entidades.Viaje;

public interface ViajeRepositorio extends JpaRepository<Viaje, Long> {
}