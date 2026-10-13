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
 * Logica de negocio relacionada con el usuario autenticado: consulta y
 * actualizacion limitada de su propio perfil.
 *
 * No expone ninguna operacion de creacion de cuentas: los usuarios se
 * insertan manualmente en la base de datos.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Busca un usuario por su identificador. Utilizado internamente por el
     * filtro de autenticacion JWT y por las operaciones de perfil.
     */
    @Transactional(readOnly = true)
    public Usuario obtenerPorId(Integer idUsuario) {
        return usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new UsuarioNoEncontradoException(
                        "No se encontro un usuario con id " + idUsuario));
    }

    /**
     * Devuelve los datos publicos del perfil del usuario autenticado. Las
     * estadisticas NO se calculan aqui (se evita ejecutar consultas de compras
     * dentro de esta transaccion): las agrega {@code UsuarioController} despues,
     * con {@link com.transportes.usuarios.dto.PerfilUsuarioResponse#conEstadisticas}.
     */
    @Transactional(readOnly = true)
    public PerfilUsuarioResponse obtenerPerfil(Integer idUsuario) {
        Usuario usuario = obtenerPorId(idUsuario);
        return mapearAPerfilResponse(usuario);
    }

    /**
     * Actualiza unicamente nombres, apellidos y numero de telefono del
     * usuario autenticado. El correo, la contrasena, el estado "activo" y
     * el id del usuario nunca se modifican aqui, ya que
     * {@link ActualizarPerfilRequest} ni siquiera declara esos campos.
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
                null // las estadisticas las agrega el controlador, fuera de la transaccion
        );
    }
}
