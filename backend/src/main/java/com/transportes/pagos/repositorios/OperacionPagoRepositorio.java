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

/** Consultas a la tabla operacion_pago. */
public interface OperacionPagoRepositorio extends JpaRepository<OperacionPago, Integer> {

    /** Busca un intento de pago por su clave, para no repetirlo. */
    Optional<OperacionPago> findByClaveIdempotencia(String claveIdempotencia);

    Optional<OperacionPago> findByReferenciaExterna(String referenciaExterna);

    Optional<OperacionPago> findByCulqiChargeId(String culqiChargeId);

    /** Lee el pago bloqueándolo, para que no se procese dos veces a la vez. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OperacionPago o WHERE o.idOperacionPago = :id")
    Optional<OperacionPago> bloquearPorId(@Param("id") Integer id);

    /** Operaciones de una sesión de reserva que están en ciertos estados. */
    List<OperacionPago> findByIdSesionReservaAndEstadoIn(String idSesionReserva, Collection<EstadoOperacion> estados);

    /** Ids de operaciones pendientes que el job debe volver a consultar. */
    @Query("SELECT o.idOperacionPago FROM OperacionPago o WHERE o.estado IN :estados "
         + "AND (o.fechaUltimaConsulta IS NULL OR o.fechaUltimaConsulta < :antesDe) ORDER BY o.fechaCreacion")
    List<Integer> buscarParaConciliar(@Param("estados") Collection<EstadoOperacion> estados,
                                      @Param("antesDe") LocalDateTime antesDe);

    /**
     * Borra la copia de pasajeros de las operaciones cerradas hace más de una hora (guardar solo lo necesario).
     */
    @Modifying
    @Query("UPDATE OperacionPago o SET o.datosPasajeros = null WHERE o.datosPasajeros IS NOT NULL "
         + "AND o.estado NOT IN :activos AND o.fechaExpiracion < :antesDe")
    int borrarDatosPasajerosVencidos(@Param("activos") Collection<EstadoOperacion> activos,
                                     @Param("antesDe") LocalDateTime antesDe);
}
