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

/** Consultas a la tabla de códigos de recuperación. */
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /** Devuelve los códigos que todavía se pueden verificar, del más nuevo al más viejo. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PasswordResetToken t "
            + "where t.idUsuario = :idUsuario and t.fechaUso is null and t.fechaVerificacion is null "
            + "and t.fechaExpiracion > :ahora "
            + "order by t.fechaCreacion desc, t.id desc")
    List<PasswordResetToken> buscarPendientesParaVerificar(@Param("idUsuario") Integer idUsuario,
                                                           @Param("ahora") LocalDateTime ahora);

    /** Anula todos los códigos abiertos de un usuario. Devuelve cuántos anuló. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PasswordResetToken t set t.fechaUso = :ahora "
            + "where t.idUsuario = :idUsuario and t.fechaUso is null")
    int invalidarPendientes(@Param("idUsuario") Integer idUsuario, @Param("ahora") LocalDateTime ahora);

    /** Anula un código. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PasswordResetToken t set t.fechaUso = :ahora where t.id = :id and t.fechaUso is null")
    int invalidar(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);

    /** Marca el código como usado. Devuelve 1 si lo marcó y 0 si no se pudo. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PasswordResetToken t set t.fechaUso = :ahora "
            + "where t.id = :id and t.fechaUso is null and t.fechaVerificacion is not null "
            + "and t.fechaVerificacion > :limiteVentana")
    int consumirVerificado(@Param("id") Long id,
                           @Param("ahora") LocalDateTime ahora,
                           @Param("limiteVentana") LocalDateTime limiteVentana);

    long countByIdUsuarioAndFechaCreacionAfter(Integer idUsuario, LocalDateTime desde);

    boolean existsByTokenHash(String tokenHash);

    /** Borra códigos vencidos hace tiempo (limpieza). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from PasswordResetToken t where t.fechaExpiracion < :limite")
    int eliminarVencidosAntesDe(@Param("limite") LocalDateTime limite);
}
