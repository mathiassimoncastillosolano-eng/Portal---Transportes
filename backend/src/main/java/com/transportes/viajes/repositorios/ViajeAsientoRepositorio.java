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

    List<ViajeAsiento> findByIdViajeAndTokenBloqueoAndEstadoViajeAsiento(
            Integer idViaje, String tokenBloqueo, String estadoViajeAsiento);

    @Query("SELECT va FROM ViajeAsiento va WHERE va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' "
         + "AND va.fechaExpiracionBloqueo < :ahora")
    List<ViajeAsiento> buscarBloqueosVencidos(@Param("ahora") LocalDateTime ahora);

    @Query("SELECT va FROM ViajeAsiento va WHERE va.idViaje = :idViaje "
         + "AND va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' AND va.fechaExpiracionBloqueo < :ahora")
    List<ViajeAsiento> buscarBloqueosVencidosDeViaje(@Param("idViaje") Integer idViaje,
                                                      @Param("ahora") LocalDateTime ahora);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'DISPONIBLE', "
         + "va.fechaExpiracionBloqueo = null, va.tokenBloqueo = null, va.idPasajero = null "
         + "WHERE va.idViajeAsiento IN :ids AND va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' "
         + "AND va.fechaExpiracionBloqueo < :ahora")
    int liberarPorIds(@Param("ids") List<Integer> ids, @Param("ahora") LocalDateTime ahora);

    @Modifying
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL', "
         + "va.fechaExpiracionBloqueo = :expiracion, va.tokenBloqueo = :token "
         + "WHERE va.idViaje = :idViaje AND va.idAsiento = :idAsiento AND va.estadoViajeAsiento = 'DISPONIBLE'")
    int bloquearAsientoSiDisponible(@Param("idViaje") Integer idViaje, @Param("idAsiento") Integer idAsiento,
                                     @Param("expiracion") LocalDateTime expiracion, @Param("token") String token);

    @Modifying
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'DISPONIBLE', "
         + "va.fechaExpiracionBloqueo = null, va.tokenBloqueo = null, va.idPasajero = null "
         + "WHERE va.idViaje = :idViaje AND va.idAsiento = :idAsiento "
         + "AND va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' AND va.tokenBloqueo = :token")
    int liberarAsientoSiPropio(@Param("idViaje") Integer idViaje, @Param("idAsiento") Integer idAsiento,
                                @Param("token") String token);

    /** Pasa a OCUPADO solo si sigue bloqueado por esa sesión Y vigente (un pago tardío no roba asientos). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'OCUPADO', "
         + "va.fechaExpiracionBloqueo = null, va.idPasajero = :idPasajero "
         + "WHERE va.idViaje = :idViaje AND va.idAsiento = :idAsiento "
         + "AND va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL' AND va.tokenBloqueo = :token "
         + "AND va.fechaExpiracionBloqueo >= :ahora")
    int confirmarAsientoSiVigente(@Param("idViaje") Integer idViaje, @Param("idAsiento") Integer idAsiento,
                                   @Param("token") String token, @Param("idPasajero") Integer idPasajero,
                                   @Param("ahora") LocalDateTime ahora);

    @Query("SELECT COUNT(va) FROM ViajeAsiento va WHERE va.idViaje = :idViaje "
         + "AND va.tokenBloqueo = :token AND va.estadoViajeAsiento = 'BLOQUEADO_TEMPORAL'")
    long contarBloqueadosPorSesion(@Param("idViaje") Integer idViaje, @Param("token") String token);

    @Query(value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(:clave))) t", nativeQuery = true)
    Integer bloquearSesion(@Param("clave") String clave);
}