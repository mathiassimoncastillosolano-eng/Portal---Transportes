package com.transportes.viajes.repositorios;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.transportes.viajes.entidades.Pasajero;

public interface PasajeroRepositorio extends JpaRepository<Pasajero, Integer> {

    Optional<Pasajero> findByTipoDocumentoAndNumeroDocumento(String tipoDocumento, String numeroDocumento);

    /** Asientos ya vendidos (OCUPADO) de ese documento en el viaje: un mismo DNI no compra dos veces. */
    @Query("SELECT COUNT(va) FROM ViajeAsiento va, Pasajero p "
         + "WHERE va.idPasajero = p.idPasajero AND va.idViaje = :idViaje "
         + "AND p.tipoDocumento = :tipoDocumento AND p.numeroDocumento = :numeroDocumento "
         + "AND va.estadoViajeAsiento = 'OCUPADO'")
    long contarAsientosOcupadosDelDocumento(@Param("idViaje") Integer idViaje,
                                            @Param("tipoDocumento") String tipoDocumento,
                                            @Param("numeroDocumento") String numeroDocumento);
}
