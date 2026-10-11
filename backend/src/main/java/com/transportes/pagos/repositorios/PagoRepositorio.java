package com.transportes.pagos.repositorios;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.pagos.entidades.Pago;

public interface PagoRepositorio extends JpaRepository<Pago, Integer> {

    Optional<Pago> findByIdVenta(Integer idVenta);
}
