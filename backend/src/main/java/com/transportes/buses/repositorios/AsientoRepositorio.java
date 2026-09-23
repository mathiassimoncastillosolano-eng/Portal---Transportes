package com.transportes.buses.repositorios;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.buses.entidades.Asiento;

public interface AsientoRepositorio extends JpaRepository<Asiento, Integer> {

    /**
     * Trae todos los asientos físicos de un bus, ya ordenados por piso
     * y número de asiento — el mismo orden en que el frontend necesita
     * pintarlos en el mapa (fila por fila, de arriba hacia abajo).
     */
    List<Asiento> findByIdBusOrderByPisoAscNumeroAsientoAsc(Integer idBus);
}