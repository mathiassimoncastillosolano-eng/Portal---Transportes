package com.transportes.servicios.repositorios;

import com.transportes.servicios.entidades.TipoBus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Repositorio JPA para consultar los tipos de bus almacenados en la
 * base de datos, utilizados como servicios en el frontend.
 */
public interface TipoBusRepositorio extends JpaRepository<TipoBus, Integer> {

    /**
     * Obtiene todos los tipos de bus ordenados por su identificador,
     * para mostrarlos como tarjetas de servicio.
     */
    List<TipoBus> findAllByOrderByIdTipoBusAsc();
}
