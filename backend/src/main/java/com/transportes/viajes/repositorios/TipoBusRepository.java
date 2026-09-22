package com.transportes.viajes.repositorios;

import com.transportes.viajes.entidades.TipoBus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TipoBusRepository extends JpaRepository<TipoBus, Integer> {

    List<TipoBus> findAllByOrderByNombreTipoAsc();
}
