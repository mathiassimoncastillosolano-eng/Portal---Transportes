package com.transportes.empleados.repositorios;

import com.transportes.empleados.entidades.Empleado;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repositorio de la tabla empleado. */
public interface EmpleadoRepository extends JpaRepository<Empleado, Integer> {

    /** Busca el empleado que corresponde a una cuenta de usuario. */
    Optional<Empleado> findByIdUsuario(Integer idUsuario);

    /** Nombre de la sede (tabla agencia) para mostrarlo en el Sistema Empresarial. */
    @Query(value = "SELECT nombre_agencia FROM agencia WHERE id_agencia = :idAgencia", nativeQuery = true)
    Optional<String> buscarNombreAgencia(@Param("idAgencia") Long idAgencia);
}
