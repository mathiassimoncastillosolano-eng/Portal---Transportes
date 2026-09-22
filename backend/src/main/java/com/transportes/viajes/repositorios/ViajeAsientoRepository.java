package com.transportes.viajes.repositorios;

import com.transportes.viajes.entidades.ViajeAsiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ViajeAsientoRepository extends JpaRepository<ViajeAsiento, Integer> {
    @Query("""
            SELECT va.viaje.idViaje AS idViaje,
                   SUM(CASE WHEN UPPER(va.estadoViajeAsiento) = 'DISPONIBLE' THEN 1L ELSE 0L END) AS disponibles,
                   MIN(CASE WHEN UPPER(va.estadoViajeAsiento) = 'DISPONIBLE' THEN va.precio ELSE NULL END) AS precioDesdeDisponible,
                   MIN(va.precio) AS precioMinimo
            FROM ViajeAsiento va
            WHERE va.viaje.idViaje IN :idsViaje
            GROUP BY va.viaje.idViaje
            """)
    List<ResumenAsientosProjection> resumenPorViajes(@Param("idsViaje") List<Integer> idsViaje);
}
