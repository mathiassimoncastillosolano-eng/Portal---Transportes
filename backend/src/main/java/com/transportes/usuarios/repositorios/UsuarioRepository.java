package com.transportes.usuarios.repositorios;

import com.transportes.usuarios.entidades.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Acceso a datos para la entidad {@link Usuario}.
 *
 * Compartido por el registro de cuentas, el login y el perfil.
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);
    boolean existsByCorreoIgnoreCase(String correo);
    

}
