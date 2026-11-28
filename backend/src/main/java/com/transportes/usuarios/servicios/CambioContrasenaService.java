package com.transportes.usuarios.servicios;

import com.transportes.usuarios.dto.CambiarContrasenaRequest;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Cambio de contraseña con sesión iniciada: pide la contraseña actual y guarda la
 * nueva cifrada con BCrypt (mismas reglas que el registro y la recuperación).
 */
@Service
public class CambioContrasenaService {

    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public CambioContrasenaService(UsuarioService usuarioService, UsuarioRepository usuarioRepository,
                                   PasswordEncoder passwordEncoder) {
        this.usuarioService = usuarioService;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void cambiar(Integer idUsuario, CambiarContrasenaRequest datos) {
        Usuario usuario = usuarioService.obtenerPorId(idUsuario);

        if (usuario.getContrasenaHash() == null) {
            // Cuenta creada solo con Google: no tiene contraseña que cambiar.
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tu cuenta inicia sesión con Google y no tiene contraseña. Usa \"¿Olvidaste tu contraseña?\" para crear una.");
        }
        if (!passwordEncoder.matches(datos.getContrasenaActual(), usuario.getContrasenaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual no es correcta.");
        }
        String nueva = datos.getContrasenaNueva();
        if (!nueva.equals(datos.getConfirmacion())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las contraseñas nuevas no coinciden.");
        }
        if (nueva.getBytes(StandardCharsets.UTF_8).length > 72) {
            // BCrypt solo usa los primeros 72 bytes (mismo límite que el registro).
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva contraseña es demasiado larga.");
        }
        if (passwordEncoder.matches(nueva, usuario.getContrasenaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva contraseña debe ser distinta de la actual.");
        }

        usuario.setContrasenaHash(passwordEncoder.encode(nueva));
        usuario.setFechaActualizacion(LocalDateTime.now());
        usuarioRepository.save(usuario);
    }
}
