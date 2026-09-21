package com.transportes.auth.servicios;

import com.transportes.auth.dto.LoginRequest;
import com.transportes.auth.dto.LoginResponse;
import com.transportes.auth.dto.UsuarioResumenResponse;
import com.transportes.auth.excepciones.CredencialesInvalidasException;
import com.transportes.security.servicios.JwtService;
import com.transportes.security.servicios.TokenInvalidadoService;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Logica de negocio del inicio y cierre de sesion.
 *
 * No implementa registro de cuentas: los usuarios ya deben existir en la
 * tabla {@code usuario} (insertados manualmente), tal como lo exige el
 * alcance de esta implementacion.
 */
@Service
public class AuthService {

    private static final String MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contrasena incorrectos.";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenInvalidadoService tokenInvalidadoService;

    public AuthService(UsuarioRepository usuarioRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        TokenInvalidadoService tokenInvalidadoService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenInvalidadoService = tokenInvalidadoService;
    }

    @Transactional(readOnly = true)
    public LoginResponse iniciarSesion(LoginRequest datos) {
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(datos.getCorreo())
                .orElseThrow(() -> new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS));

        if (!usuario.estaActivo()) {
            throw new CredencialesInvalidasException("El usuario se encuentra inactivo.");
        }

        // Nunca se compara la contrasena en texto plano: passwordEncoder.matches
        // aplica el mismo algoritmo BCrypt utilizado para generar el hash
        // almacenado y compara de forma segura.
        if (!passwordEncoder.matches(datos.getContrasena(), usuario.getContrasenaHash())) {
            throw new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS);
        }

        String token = jwtService.generarToken(usuario.getIdUsuario(), usuario.getCorreo());

        UsuarioResumenResponse resumen = new UsuarioResumenResponse(
                usuario.getIdUsuario(), usuario.getNombres(), usuario.getApellidos(), usuario.getCorreo());

        return new LoginResponse(token, resumen);
    }

    /**
     * Invalida el token actual agregando su {@code jti} a la lista de
     * tokens invalidados (ver {@link TokenInvalidadoService}), de modo que
     * ya no pueda volver a usarse para autenticar peticiones, aunque su
     * firma siga siendo tecnicamente valida hasta su expiracion natural.
     */
    public void cerrarSesion(String jti, java.time.Instant expiracion) {
        tokenInvalidadoService.invalidar(jti, expiracion);
    }
}
