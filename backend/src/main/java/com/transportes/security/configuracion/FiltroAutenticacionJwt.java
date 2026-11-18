package com.transportes.security.configuracion;

import com.transportes.empleados.servicios.EmpleadoService;
import com.transportes.security.servicios.DetalleTokenJwt;
import com.transportes.security.servicios.JwtService;
import com.transportes.security.servicios.TokenInvalidadoService;
import com.transportes.security.servicios.UsuarioAutenticado;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.servicios.UsuarioService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/** Se ejecuta en cada petición: lee el token, lo valida y marca al usuario como autenticado. */
public class FiltroAutenticacionJwt extends OncePerRequestFilter {

    private static final String PREFIJO_BEARER = "Bearer ";

    private final JwtService jwtService;
    private final TokenInvalidadoService tokenInvalidadoService;
    private final UsuarioService usuarioService;
    private final EmpleadoService empleadoService;

    public FiltroAutenticacionJwt(JwtService jwtService,
                                TokenInvalidadoService tokenInvalidadoService,
                                UsuarioService usuarioService,
                                EmpleadoService empleadoService) {
        this.jwtService = jwtService;
        this.tokenInvalidadoService = tokenInvalidadoService;
        this.usuarioService = usuarioService;
        this.empleadoService = empleadoService;
    }

    /** Valida el token de la petición y, si está bien, marca al usuario como autenticado. */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String encabezado = request.getHeader("Authorization");

        if (encabezado == null || !encabezado.startsWith(PREFIJO_BEARER)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = encabezado.substring(PREFIJO_BEARER.length());

        try {
            Claims claims = jwtService.validarYObtenerClaims(token);
            String jti = jwtService.obtenerJti(claims);

            if (tokenInvalidadoService.estaInvalidado(jti)) {
                filterChain.doFilter(request, response);
                return;
            }

            Integer idUsuario = jwtService.obtenerIdUsuario(claims);
            Usuario usuario = usuarioService.obtenerPorId(idUsuario);

            if (usuario.estaActivo() && SecurityContextHolder.getContext().getAuthentication() == null) {
                // AGENCIA o GERENTE si está en la tabla empleado; si no, CLIENTE.
                String rol = empleadoService.obtenerRol(usuario.getIdUsuario());
                UsuarioAutenticado principal = new UsuarioAutenticado(usuario.getIdUsuario(), usuario.getCorreo(), rol);

                // Spring espera el rol con prefijo: "ROLE_AGENCIA", "ROLE_GERENTE" o "ROLE_CLIENTE". Así funciona
                // hasAnyRole(...).
                SimpleGrantedAuthority permiso = new SimpleGrantedAuthority("ROLE_" + rol);

                UsernamePasswordAuthenticationToken autenticacion =
                        new UsernamePasswordAuthenticationToken(principal, null, List.of(permiso));
                autenticacion.setDetails(new DetalleTokenJwt(jti, jwtService.obtenerExpiracion(claims)));
                SecurityContextHolder.getContext().setAuthentication(autenticacion);
            }
        } catch (JwtException | IllegalArgumentException excepcion) {
            // Token inválido o vencido: no se autentica. Si la ruta es privada, Spring responderá 401.
            SecurityContextHolder.clearContext();
        } catch (RuntimeException excepcion) {
            // El usuario del token ya no existe: se trata como token inválido.
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
