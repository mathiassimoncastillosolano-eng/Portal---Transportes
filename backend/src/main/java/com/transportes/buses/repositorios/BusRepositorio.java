package com.transportes.buses.repositorios;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.buses.entidades.Bus;

public interface BusRepositorio extends JpaRepository<Bus, Integer> {
}
