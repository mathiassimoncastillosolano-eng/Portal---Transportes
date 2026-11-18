package com.transportes.pagos.repositorios;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.transportes.pagos.entidades.EstadoOperacion;
import com.transportes.pagos.entidades.OperacionPago;

import jakarta.persistence.LockModeType;

/**
 * Acceso a operacion_pago: cada intento de pago con Mercado Pago. Incluye el bloqueo de fila que evita
 * procesar dos veces el mismo pago.
 */
public interface OperacionPagoRepositorio extends JpaRepository<OperacionPago, Integer> {

    /** Detecta un doble clic: misma clave = misma operación. */
    Optional<OperacionPago> findByClaveIdempotencia(String claveIdempotencia);

    Optional<OperacionPago> findByReferenciaExterna(String referenciaExterna);

    Optional<OperacionPago> findByMpOrderId(String mpOrderId);

    /** Fila bloqueada (SELECT ... FOR UPDATE): serializa webhook, consulta y job sobre la misma operación. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OperacionPago o WHERE o.idOperacionPago = :id")
    Optional<OperacionPago> bloquearPorId(@Param("id") Integer id);

    /** Operaciones activas de una sesión de reserva. */
    List<OperacionPago> findByIdSesionReservaAndEstadoIn(String idSesionReserva, Collection<EstadoOperacion> estados);

    /** Ids pendientes que el job de conciliación debe volver a consultar. */
    @Query("SELECT o.idOperacionPago FROM OperacionPago o WHERE o.estado IN :estados "
         + "AND (o.fechaUltimaConsulta IS NULL OR o.fechaUltimaConsulta < :antesDe) ORDER BY o.fechaCreacion")
    List<Integer> buscarParaConciliar(@Param("estados") Collection<EstadoOperacion> estados,
                                      @Param("antesDe") LocalDateTime antesDe);

    /** Minimización de datos: borra la copia de pasajeros de operaciones cerradas hace más de una hora. */
    @Modifying
    @Query("UPDATE OperacionPago o SET o.datosPasajeros = null WHERE o.datosPasajeros IS NOT NULL "
         + "AND o.estado NOT IN :activos AND o.fechaExpiracion < :antesDe")
    int borrarDatosPasajerosVencidos(@Param("activos") Collection<EstadoOperacion> activos,
                                     @Param("antesDe") LocalDateTime antesDe);
}
