package com.transportes.buses.repositorios;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.buses.entidades.Asiento;

/** Repositorio de la tabla asiento. Spring Data genera las consultas a partir del nombre del método. */
public interface AsientoRepositorio extends JpaRepository<Asiento, Integer> {

    /** Asientos de un bus ordenados por piso y número: el mismo orden en que el frontend pinta el mapa. */
    List<Asiento> findByIdBusOrderByPisoAscNumeroAsientoAsc(Integer idBus);
}