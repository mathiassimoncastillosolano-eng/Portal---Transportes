package com.transportes.pagos.repositorios;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.pagos.entidades.Pasaje;

public interface PasajeRepositorio extends JpaRepository<Pasaje, Integer> {

    List<Pasaje> findByIdVentaOrderByIdPasaje(Integer idVenta);

    boolean existsByIdViajeAsiento(Integer idViajeAsiento);
}
