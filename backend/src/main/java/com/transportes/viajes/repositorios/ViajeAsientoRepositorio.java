package com.transportes.viajes.repositorios;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.transportes.viajes.entidades.ViajeAsiento;

public interface ViajeAsientoRepositorio extends JpaRepository<ViajeAsiento, Integer> {

    List<ViajeAsiento> findByIdViaje(Integer idViaje);

    Optional<ViajeAsiento> findByIdViajeAndIdAsiento(Integer idViaje, Integer idAsiento);

    @Modifying
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'DISPONIBLE', "
         + "va.fechaExpiracionBloqueo = null, va.tokenBloqueo = null, va.idPasajero = null "
         + "WHERE va.idViaje = :idViaje AND va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' "
         + "AND va.fechaExpiracionBloqueo < CURRENT_TIMESTAMP")
    int liberarBloqueosVencidos(@Param("idViaje") Integer idViaje);

    @Modifying
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'DISPONIBLE', "
         + "va.fechaExpiracionBloqueo = null, va.tokenBloqueo = null, va.idPasajero = null "
         + "WHERE va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' "
         + "AND va.fechaExpiracionBloqueo < CURRENT_TIMESTAMP")
    int liberarTodosBloqueosVencidos();

    @Modifying
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL', "
         + "va.fechaExpiracionBloqueo = :expiracion, va.tokenBloqueo = :token, va.idPasajero = :idPasajero "
         + "WHERE va.idViaje = :idViaje AND va.idAsiento = :idAsiento AND va.estadoViajeAsiento = 'DISPONIBLE'")
    int bloquearAsientoSiDisponible(@Param("idViaje") Integer idViaje, @Param("idAsiento") Integer idAsiento,
                                     @Param("expiracion") LocalDateTime expiracion, @Param("token") String token,
                                     @Param("idPasajero") Integer idPasajero);

    @Modifying
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'DISPONIBLE', "
         + "va.fechaExpiracionBloqueo = null, va.tokenBloqueo = null, va.idPasajero = null "
         + "WHERE va.idViaje = :idViaje AND va.idAsiento = :idAsiento "
         + "AND va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' AND va.tokenBloqueo = :token")
    int liberarAsientoSiPropio(@Param("idViaje") Integer idViaje, @Param("idAsiento") Integer idAsiento,
                                @Param("token") String token);
}