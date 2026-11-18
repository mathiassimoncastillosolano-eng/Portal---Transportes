package com.transportes.usuarios.servicios;

import com.transportes.usuarios.dto.ActualizarPerfilRequest;
import com.transportes.usuarios.dto.PerfilUsuarioResponse;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.excepciones.UsuarioNoEncontradoException;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Lógica del perfil del usuario con sesión: consultarlo y actualizar solo algunos datos. El registro de cuentas
 * está en RegistroUsuarioService.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Busca un usuario por id. Lo usan el filtro JWT y el perfil. */
    @Transactional(readOnly = true)
    public Usuario obtenerPorId(Integer idUsuario) {
        return usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNoEncontradoException(
                        "No se encontro un usuario con id " + idUsuario));
    }

    /**
     * Datos del perfil del usuario. Los contadores no se calculan aquí: los agrega UsuarioController después,
     * fuera de esta transacción.
     */
    @Transactional(readOnly = true)
    public PerfilUsuarioResponse obtenerPerfil(Integer idUsuario) {
        Usuario usuario = obtenerPorId(idUsuario);
        return mapearAPerfilResponse(usuario);
    }

    /**
     * Actualiza solo nombres, apellidos y teléfono. Correo, contraseña, estado e id no se pueden cambiar porque
     * ActualizarPerfilRequest no los tiene.
     */
    @Transactional
    public PerfilUsuarioResponse actualizarPerfil(Integer idUsuario, ActualizarPerfilRequest datos) {
        Usuario usuario = obtenerPorId(idUsuario);

        usuario.setNombres(datos.getNombres().trim());
        usuario.setApellidos(datos.getApellidos().trim());
        usuario.setNroTelefono(
                datos.getNroTelefono() == null || datos.getNroTelefono().isBlank()
                        ? null
                        : datos.getNroTelefono().trim()
        );
        usuario.setFechaActualizacion(LocalDateTime.now());

        Usuario actualizado = usuarioRepository.save(usuario);
        return mapearAPerfilResponse(actualizado);
    }

    private PerfilUsuarioResponse mapearAPerfilResponse(Usuario usuario) {
        return new PerfilUsuarioResponse(
                usuario.getIdUsuario(),
                usuario.getNombres(),
                usuario.getApellidos(),
                usuario.getCorreo(),
                usuario.getNroTelefono(),
                null // los contadores los agrega el controlador
        );
    }
}
