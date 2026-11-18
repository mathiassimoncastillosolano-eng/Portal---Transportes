package com.transportes.auth.servicios;

import com.transportes.auth.dto.IdentidadGoogle;
import com.transportes.auth.dto.LoginResponse;
import com.transportes.auth.dto.UsuarioResumenResponse;
import com.transportes.auth.excepciones.CredencialesInvalidasException;
import com.transportes.auth.excepciones.CuentaExistenteException;
import com.transportes.security.servicios.JwtService;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Entrar, registrarse y vincular la cuenta con Google. El JWT que se entrega es el mismo del login normal.
 * Reglas de iniciarSesion:
 * 1) Si ya hay un usuario con ese google_id -> entra.
 * 2) Si el correo ya existe con contraseña -> 409. No se vincula solo: el registro no verifica correos, así que
 * otra persona pudo crear esa cuenta; vincularla le daría acceso a la cuenta del dueño real. Se vincula desde el
 * perfil (vincular).
 * 3) Si el correo existe con otro google_id -> 409.
 * 4) Si no existe -> se crea el usuario sin contraseña.
 */
@Service
public class GoogleAuthService {

    private static final String SIN_APELLIDO = "-";

    private final VerificadorTokenGoogle verificador;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    public GoogleAuthService(VerificadorTokenGoogle verificador,
                             UsuarioRepository usuarioRepository,
                             JwtService jwtService) {
        this.verificador = verificador;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    /**
     * Login con Google: valida el ID token, busca la cuenta por su google_id o la crea, y devuelve nuestro JWT.
     */
    public LoginResponse iniciarSesion(String credencial) {
        IdentidadGoogle identidad = verificador.verificar(credencial);

        Usuario usuario = usuarioRepository.findByGoogleId(identidad.googleId()).orElse(null);
        if (usuario == null) {
            comprobarCorreoDisponible(identidad);
            usuario = crearUsuario(identidad);
        }

        if (!usuario.estaActivo()) {
            throw new CredencialesInvalidasException("El usuario se encuentra inactivo.");
        }

        String token = jwtService.generarToken(usuario.getIdUsuario(), usuario.getCorreo());
        return new LoginResponse(token, new UsuarioResumenResponse(
                usuario.getIdUsuario(), usuario.getNombres(), usuario.getApellidos(), usuario.getCorreo()));
    }

    /**
     * Vincular Google a un usuario que ya inició sesión: el correo de Google debe ser el mismo de la cuenta y esa
     * cuenta de Google no puede ser de otro usuario.
     */
    public void vincular(Integer idUsuario, String credencial) {
        IdentidadGoogle identidad = verificador.verificar(credencial);

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new CredencialesInvalidasException("No autenticado. Inicie sesion nuevamente."));

        if (!usuario.getCorreo().equalsIgnoreCase(identidad.correo())) {
            throw new CuentaExistenteException(
                    "La cuenta de Google debe usar el mismo correo de tu cuenta de RutaLibre.");
        }
        if (usuario.getGoogleId() != null) {
            if (usuario.getGoogleId().equals(identidad.googleId())) {
                return; // ya estaba vinculada
            }
            throw new CuentaExistenteException("Tu cuenta ya esta vinculada a otra cuenta de Google.");
        }
        if (usuarioRepository.findByGoogleId(identidad.googleId()).isPresent()) {
            throw new CuentaExistenteException("Esa cuenta de Google ya esta asociada a otro usuario.");
        }

        usuario.setGoogleId(identidad.googleId());
        try {
            usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException e) {
            throw new CuentaExistenteException("Esa cuenta de Google ya esta asociada a otro usuario.");
        }
    }

    /** 409 si el correo ya pertenece a otra cuenta. */
    private void comprobarCorreoDisponible(IdentidadGoogle identidad) {
        Optional<Usuario> existente = usuarioRepository.findByCorreoIgnoreCase(identidad.correo());
        if (existente.isEmpty()) {
            return;
        }
        if (existente.get().getGoogleId() != null) {
            // Mismo correo, pero otra cuenta de Google.
            throw new CuentaExistenteException("Este correo esta asociado a otra cuenta de Google.");
        }
        throw new CuentaExistenteException(
                "Ya existe una cuenta con este correo. Inicia sesion con tu correo y contrasena.");
    }

    private Usuario crearUsuario(IdentidadGoogle identidad) {
        Usuario usuario = new Usuario();
        usuario.setNombres(recortar(nombresDe(identidad), 100));
        usuario.setApellidos(recortar(apellidosDe(identidad), 100));
        usuario.setCorreo(identidad.correo());
        usuario.setGoogleId(identidad.googleId());
        usuario.setContrasenaHash(null);
        usuario.setActivo(true);

        try {
            // save guarda y confirma antes de devolver el usuario.
            return usuarioRepository.save(usuario);
        } catch (DataIntegrityViolationException e) {
            // Dos primeros ingresos al mismo tiempo: el otro ya creó la fila, se usa esa.
            Optional<Usuario> concurrente = usuarioRepository.findByGoogleId(identidad.googleId());
            if (concurrente.isPresent()) {
                return concurrente.get();
            }
            if (usuarioRepository.existsByCorreoIgnoreCase(identidad.correo())) {
                throw new CuentaExistenteException(
                        "Ya existe una cuenta con este correo. Inicia sesion con tu correo y contrasena.");
            }
            throw e;
        }
    }

    private static String nombresDe(IdentidadGoogle identidad) {
        if (hay(identidad.nombres())) {
            return identidad.nombres().trim();
        }
        if (hay(identidad.nombreCompleto())) {
            return identidad.nombreCompleto().trim().split("\\s+", 2)[0];
        }
        return identidad.correo().split("@", 2)[0];
    }

    private static String apellidosDe(IdentidadGoogle identidad) {
        if (hay(identidad.apellidos())) {
            return identidad.apellidos().trim();
        }
        if (!hay(identidad.nombres()) && hay(identidad.nombreCompleto())) {
            String[] partes = identidad.nombreCompleto().trim().split("\\s+", 2);
            if (partes.length == 2) {
                return partes[1];
            }
        }
        // La columna apellidos no admite nulos; el usuario lo puede completar luego en su perfil.
        return SIN_APELLIDO;
    }

    private static boolean hay(String valor) {
        return valor != null && !valor.isBlank();
    }

    private static String recortar(String valor, int maximo) {
        return valor.length() <= maximo ? valor : valor.substring(0, maximo);
    }
}
