package com.transportes.pagos.repositorios;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.pagos.entidades.MetodoPago;

/** Repositorio de la tabla metodo_pago. */
public interface MetodoPagoRepositorio extends JpaRepository<MetodoPago, Integer> {

    Optional<MetodoPago> findByNombreMetodoAndActivoTrue(String nombreMetodo);
}
