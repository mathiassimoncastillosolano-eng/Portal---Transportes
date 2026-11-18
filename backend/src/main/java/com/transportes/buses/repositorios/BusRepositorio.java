package com.transportes.buses.repositorios;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.buses.entidades.Bus;

/** Acceso a la tabla bus (CRUD heredado de JpaRepository). */
public interface BusRepositorio extends JpaRepository<Bus, Integer> {
}
