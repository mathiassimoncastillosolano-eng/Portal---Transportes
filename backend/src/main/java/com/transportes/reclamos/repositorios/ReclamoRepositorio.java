package com.transportes.reclamos.repositorios;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transportes.reclamos.entidades.Reclamo;

public interface ReclamoRepositorio extends JpaRepository<Reclamo, Integer> {

    Optional<Reclamo> findByCodigo(String codigo);

    Optional<Reclamo> findByClaveIdempotencia(UUID claveIdempotencia);
}
