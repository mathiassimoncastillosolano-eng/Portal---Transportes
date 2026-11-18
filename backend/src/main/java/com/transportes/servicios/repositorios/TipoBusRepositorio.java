package com.transportes.servicios.repositorios;

import com.transportes.servicios.entidades.TipoBus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio de la tabla tipo_bus. */
public interface TipoBusRepositorio extends JpaRepository<TipoBus, Integer> {

    /** Todos los tipos de bus ordenados por id. */
    List<TipoBus> findAllByOrderByIdTipoBusAsc();
}
