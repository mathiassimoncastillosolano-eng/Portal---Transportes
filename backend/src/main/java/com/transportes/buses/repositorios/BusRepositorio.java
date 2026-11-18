package com.transportes.buses.repositorios;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.buses.entidades.Bus;

/** Repositorio de la tabla bus. Hereda de JpaRepository las operaciones básicas (buscar, guardar, listar). */
public interface BusRepositorio extends JpaRepository<Bus, Integer> {
}
