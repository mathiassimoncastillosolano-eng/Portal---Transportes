package com.transportes.pagos.repositorios;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.pagos.entidades.Venta;

/** Acceso a la tabla venta (la compra). */
public interface VentaRepositorio extends JpaRepository<Venta, Integer> {
}
