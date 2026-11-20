package com.transportes.postergacion.repositorios;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.transportes.postergacion.entidades.Postergacion;

/** Consultas a la tabla postergacion y cambios de asiento del pasaje. */
public interface PostergacionRepositorio extends JpaRepository<Postergacion, Integer> {

    List<Postergacion> findByIdPasajeOrderByIdPostergacion(Integer idPasaje);

    Optional<Postergacion> findByReferenciaPago(String referenciaPago);

    /**
     * Pasa el pasaje al asiento nuevo, solo si todavía tiene el asiento que se esperaba (nadie lo movió antes).
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Pasaje p SET p.idViajeAsiento = :nuevo "
         + "WHERE p.idPasaje = :idPasaje AND p.idViajeAsiento = :anterior")
    int moverPasajeAlAsiento(@Param("idPasaje") Integer idPasaje, @Param("anterior") Integer anterior,
                             @Param("nuevo") Integer nuevo);

    /** Deja DISPONIBLE el asiento original, solo si estaba OCUPADO. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'DISPONIBLE', "
         + "va.fechaExpiracionBloqueo = null, va.tokenBloqueo = null, va.idPasajero = null "
         + "WHERE va.idViajeAsiento = :idViajeAsiento AND va.estadoViajeAsiento = 'OCUPADO'")
    int liberarAsientoOcupado(@Param("idViajeAsiento") Integer idViajeAsiento);
}
