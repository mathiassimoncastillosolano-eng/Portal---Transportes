package com.transportes.auth.servicios;

import com.transportes.auth.dto.LoginEmpresarialResponse;
import com.transportes.auth.dto.LoginRequest;
import com.transportes.auth.dto.LoginResponse;
import com.transportes.auth.dto.UsuarioResumenResponse;
import com.transportes.auth.excepciones.AccesoEmpresarialDenegadoException;
import com.transportes.auth.excepciones.CredencialesInvalidasException;
import com.transportes.empleados.entidades.Empleado;
import com.transportes.empleados.servicios.EmpleadoService;
import com.transportes.security.servicios.JwtService;
import com.transportes.security.servicios.TokenInvalidadoService;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lógica del login (Portal y Sistema Empresarial) y del logout.
 * Patrón Fachada: el controlador llama a un solo método y este coordina usuarios, BCrypt, empleados y JWT.
 */
@Service
public class AuthService {

    private static final String MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contrasena incorrectos.";
    private static final String MENSAJE_SIN_ACCESO_EMPRESARIAL =
            "Tu cuenta no tiene acceso al Sistema Empresarial.";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenInvalidadoService tokenInvalidadoService;
    private final EmpleadoService empleadoService;

    public AuthService(UsuarioRepository usuarioRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        TokenInvalidadoService tokenInvalidadoService,
                        EmpleadoService empleadoService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenInvalidadoService = tokenInvalidadoService;
        this.empleadoService = empleadoService;
    }

    /** Login del Portal: cualquier cuenta activa con correo y contraseña correctos. */
    @Transactional(readOnly = true)
    public LoginResponse iniciarSesion(LoginRequest datos) {
        Usuario usuario = validarCredenciales(datos);
        return crearRespuesta(usuario);
    }

    /**
     * Login del Sistema Empresarial: además de las credenciales, exige una fila activa en la tabla empleado. Si no
     * la hay -> 403 y no se entrega token.
     */
    @Transactional(readOnly = true)
    public LoginEmpresarialResponse iniciarSesionEmpresarial(LoginRequest datos) {
        Usuario usuario = validarCredenciales(datos);

        Empleado empleado = empleadoService.buscarEmpleadoActivo(usuario.getIdUsuario())
                .orElseThrow(() -> new AccesoEmpresarialDenegadoException(MENSAJE_SIN_ACCESO_EMPRESARIAL));

        String token = jwtService.generarToken(usuario.getIdUsuario(), usuario.getCorreo());
        return new LoginEmpresarialResponse(
                token,
                crearResumen(usuario),
                empleado.getRol().name(),
                empleado.getIdAgencia(),
                empleadoService.obtenerNombreSede(empleado));
    }

    /**
     * Reglas comunes de los dos logins: el correo existe, la cuenta está activa, tiene contraseña y la contraseña
     * coincide. Si algo falla -> 401 con el mismo mensaje.
     */
    private Usuario validarCredenciales(LoginRequest datos) {
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(datos.getCorreo())
                .orElseThrow(() -> new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS));

        if (!usuario.estaActivo()) {
            throw new CredencialesInvalidasException("El usuario se encuentra inactivo.");
        }

        // Cuenta creada solo con Google: no tiene contraseña, así que no puede entrar por aquí.
        if (usuario.getContrasenaHash() == null) {
            throw new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS);
        }

        // BCrypt compara la contraseña escrita con el hash guardado. Nunca se compara texto plano.
        if (!passwordEncoder.matches(datos.getContrasena(), usuario.getContrasenaHash())) {
            throw new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS);
        }

        return usuario;
    }

    /** Crea el JWT y lo devuelve con los datos básicos del usuario. */
    private LoginResponse crearRespuesta(Usuario usuario) {
        String token = jwtService.generarToken(usuario.getIdUsuario(), usuario.getCorreo());
        return new LoginResponse(token, crearResumen(usuario));
    }

    private UsuarioResumenResponse crearResumen(Usuario usuario) {
        return new UsuarioResumenResponse(
                usuario.getIdUsuario(), usuario.getNombres(), usuario.getApellidos(), usuario.getCorreo());
    }

    /** Logout: agrega el jti del token a la lista negra (TokenInvalidadoService) hasta que el token vencería. */
    public void cerrarSesion(String jti, java.time.Instant expiracion) {
        tokenInvalidadoService.invalidar(jti, expiracion);
    }
}
