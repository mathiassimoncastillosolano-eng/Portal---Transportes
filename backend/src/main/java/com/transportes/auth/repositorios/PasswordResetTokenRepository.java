package com.transportes.auth.repositorios;

import com.transportes.auth.entidades.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Acceso a los desafios de recuperacion. Las operaciones que deben ser atomicas
 * (consumir, invalidar) son sentencias UPDATE condicionales: la base de datos
 * decide quien gana ante solicitudes simultaneas.
 */
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Desafios que aun admiten verificar el codigo (no usados, no verificados, no
     * vencidos), del mas reciente al mas antiguo. Bloquea la fila (SELECT ... FOR
     * UPDATE) para que los intentos concurrentes se cuenten uno a uno.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PasswordResetToken t "
            + "where t.idUsuario = :idUsuario and t.fechaUso is null and t.fechaVerificacion is null "
            + "and t.fechaExpiracion > :ahora "
            + "order by t.fechaCreacion desc, t.id desc")
    List<PasswordResetToken> buscarPendientesParaVerificar(@Param("idUsuario") Integer idUsuario,
                                                           @Param("ahora") LocalDateTime ahora);

    /** Invalida todos los desafios aun abiertos de un usuario. Devuelve cuantos cerro. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PasswordResetToken t set t.fechaUso = :ahora "
            + "where t.idUsuario = :idUsuario and t.fechaUso is null")
    int invalidarPendientes(@Param("idUsuario") Integer idUsuario, @Param("ahora") LocalDateTime ahora);

    /** Invalida un desafio concreto (por ejemplo, si el correo no pudo enviarse). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PasswordResetToken t set t.fechaUso = :ahora where t.id = :id and t.fechaUso is null")
    int invalidar(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);

    /**
     * Consume el desafio una unica vez: solo tiene exito si esta verificado, sin usar
     * y dentro de la ventana de cambio. Devuelve 1 si lo consumio, 0 en caso contrario.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PasswordResetToken t set t.fechaUso = :ahora "
            + "where t.id = :id and t.fechaUso is null and t.fechaVerificacion is not null "
            + "and t.fechaVerificacion > :limiteVentana")
    int consumirVerificado(@Param("id") Long id,
                           @Param("ahora") LocalDateTime ahora,
                           @Param("limiteVentana") LocalDateTime limiteVentana);

    long countByIdUsuarioAndFechaCreacionAfter(Integer idUsuario, LocalDateTime desde);

    boolean existsByTokenHash(String tokenHash);

    /** Limpieza periodica de desafios vencidos hace mucho. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from PasswordResetToken t where t.fechaExpiracion < :limite")
    int eliminarVencidosAntesDe(@Param("limite") LocalDateTime limite);
}
