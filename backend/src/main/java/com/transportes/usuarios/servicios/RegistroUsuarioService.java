package com.transportes.usuarios.servicios;

import com.transportes.usuarios.dto.RegistroUsuarioRequest;
import com.transportes.usuarios.dto.RegistroUsuarioResponse;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.excepciones.CorreoYaRegistradoException;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Lógica del registro de cuentas. */
@Service
public class RegistroUsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistroUsuarioService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder) {

        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Crea una cuenta nueva con la contraseña cifrada. Si el correo ya existe, responde 409. */
    public RegistroUsuarioResponse registrar(
            RegistroUsuarioRequest solicitud) {

        String correo = solicitud.getCorreo()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (usuarioRepository.existsByCorreoIgnoreCase(correo)) {
            throw new CorreoYaRegistradoException();
        }

        String contrasena = solicitud.getContrasena();

        if (contrasena.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña supera el límite de 72 bytes de BCrypt"
            );
        }

        Usuario usuario = new Usuario();
        usuario.setNombres(solicitud.getNombres().trim());
        usuario.setApellidos(solicitud.getApellidos().trim());
        usuario.setCorreo(correo);
        String telefono = solicitud.getNroTelefono();
        usuario.setNroTelefono(telefono == null || telefono.isBlank() ? null : telefono.strip());
        usuario.setContrasenaHash(passwordEncoder.encode(contrasena));
        usuario.setActivo(true);

        Usuario guardado;
        try {
            // save guarda y confirma antes de devolver el usuario.
            guardado = usuarioRepository.save(usuario);
        } catch (DataIntegrityViolationException error) {
            // Si otra solicitud registró el mismo correo justo antes, se responde 409 en vez de un error genérico.
            if (usuarioRepository.existsByCorreoIgnoreCase(correo)) {
                throw new CorreoYaRegistradoException();
            }
            throw error;
        }

        return new RegistroUsuarioResponse(
                guardado.getIdUsuario(),
                guardado.getNombres(),
                guardado.getApellidos(),
                guardado.getCorreo()
        );
    }
}
