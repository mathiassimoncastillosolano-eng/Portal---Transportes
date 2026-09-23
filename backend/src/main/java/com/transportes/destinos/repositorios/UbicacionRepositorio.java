package com.transportes.destinos.repositorios;

import com.transportes.destinos.entidades.Ubicacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Repositorio JPA para consultar las ubicaciones almacenadas en la base
 * de datos, utilizadas como destinos en el frontend.
 */
public interface UbicacionRepositorio extends JpaRepository<Ubicacion, Long> {

    /**
     * Obtiene únicamente las ubicaciones activas, ordenadas
     * alfabéticamente por nombre, para mostrarlas como destinos.
     */
    List<Ubicacion> findByActivaTrueOrderByNombreAsc();
}
