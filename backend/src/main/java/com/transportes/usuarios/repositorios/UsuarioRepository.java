package com.transportes.usuarios.repositorios;

import com.transportes.usuarios.entidades.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Acceso a datos para la entidad {@link Usuario}.
 *
 * No incluye metodos de creacion de usuarios: las cuentas se insertan
 * manualmente en la base de datos, tal como lo indica el alcance de esta
 * implementacion (no se desarrolla registro de usuarios).
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);
    

}
