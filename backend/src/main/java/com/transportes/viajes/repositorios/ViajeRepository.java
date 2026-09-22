package com.transportes.viajes.repositorios;

import com.transportes.viajes.entidades.Viaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ViajeRepository extends JpaRepository<Viaje, Integer> {

    /**
     * Trae TODOS los viajes con todas las relaciones que la tarjeta
     * necesita en UNA sola consulta (JOIN FETCH)
     * DISTINCT es necesario porque el JOIN FETCH de `tb.servicios`
     * (una colección) puede repetir la fila del viaje una vez por cada
     * servicio de su tipo de bus.
     */
    @Query("""
            SELECT DISTINCT v FROM Viaje v
            JOIN FETCH v.programacion p
            JOIN FETCH p.ruta r
            JOIN FETCH r.agenciaOrigen ao
            JOIN FETCH ao.ubicacion
            JOIN FETCH r.agenciaDestino ad
            JOIN FETCH ad.ubicacion
            JOIN FETCH p.tipoBus tb
            LEFT JOIN FETCH tb.servicios
            JOIN FETCH v.bus b
            """)
    List<Viaje> buscarTodosConDetalles();
}
