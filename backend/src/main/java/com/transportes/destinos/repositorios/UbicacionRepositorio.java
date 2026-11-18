package com.transportes.destinos.repositorios;

import com.transportes.destinos.entidades.Ubicacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repositorio de la tabla ubicacion. */
public interface UbicacionRepositorio extends JpaRepository<Ubicacion, Long> {

    /**
     * Ubicaciones activas ordenadas por nombre (A-Z). La consulta la genera Spring Data a partir del nombre del
     * método.
     */
    List<Ubicacion> findByActivaTrueOrderByNombreAsc();
}
