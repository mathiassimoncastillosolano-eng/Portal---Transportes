package com.transportes.pagos.repositorios;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.pagos.entidades.AuditoriaPago;

/** Consultas a la tabla auditoria_pago (intentos de pago registrados por el personal de agencia). */
public interface AuditoriaPagoRepositorio extends JpaRepository<AuditoriaPago, Integer> {

    /** Busca un intento por su clave; sirve para no registrar dos veces el mismo intento. */
    Optional<AuditoriaPago> findByClaveIdempotencia(String claveIdempotencia);

    /** Intentos de pago de un pasaje para un concepto (p. ej. CAMBIO_VIAJE), del más antiguo al más reciente. */
    List<AuditoriaPago> findByIdPasajeAndConceptoOrderByIdAuditoriaPago(Integer idPasaje, String concepto);
}
