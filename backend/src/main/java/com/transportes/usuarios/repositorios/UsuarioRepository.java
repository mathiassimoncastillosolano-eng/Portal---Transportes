package com.transportes.usuarios.repositorios;

import com.transportes.usuarios.entidades.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Repositorio de la tabla usuario. Lo usan el registro, el login y el perfil. */
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);
    boolean existsByCorreoIgnoreCase(String correo);
    Optional<Usuario> findByGoogleId(String googleId);

}
