package com.transportes.security.configuracion;

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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filtro que se ejecuta una vez por cada peticion HTTP y es el corazon de
 * la proteccion de endpoints mediante JWT:
 *
 * <ol>
 *     <li>Extrae el token del encabezado {@code Authorization: Bearer <token>}.</li>
 *     <li>Si no hay token, deja que la peticion continue sin autenticar
 *         (las rutas publicas simplemente no lo requieren; las privadas
 *         seran rechazadas mas adelante por Spring Security).</li>
 *     <li>Si hay token, valida su firma y expiracion, y verifica que no
 *         haya sido invalidado por un cierre de sesion previo.</li>
 *     <li>Si el token es valido, carga al usuario y confirma que siga
 *         activo, y establece la autenticacion en el contexto de
 *         seguridad de Spring.</li>
 * </ol>
 */
public class FiltroAutenticacionJwt extends OncePerRequestFilter {

    private static final String PREFIJO_BEARER = "Bearer ";

    private final JwtService jwtService;
    private final TokenInvalidadoService tokenInvalidadoService;
    private final UsuarioService usuarioService;

    public FiltroAutenticacionJwt(JwtService jwtService,
                                TokenInvalidadoService tokenInvalidadoService,
                                UsuarioService usuarioService) {
        this.jwtService = jwtService;
        this.tokenInvalidadoService = tokenInvalidadoService;
        this.usuarioService = usuarioService;
    }

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
                UsuarioAutenticado principal = new UsuarioAutenticado(usuario.getIdUsuario(), usuario.getCorreo());

                UsernamePasswordAuthenticationToken autenticacion =
                        new UsernamePasswordAuthenticationToken(principal, null, List.of());
                autenticacion.setDetails(new DetalleTokenJwt(jti, jwtService.obtenerExpiracion(claims)));
                SecurityContextHolder.getContext().setAuthentication(autenticacion);
            }
        } catch (JwtException | IllegalArgumentException excepcion) {
            // Token invalido, mal formado o expirado: simplemente no se
            // autentica la peticion. Si el endpoint es privado, Spring
            // Security respondera 401 mas adelante en la cadena.
            SecurityContextHolder.clearContext();
        } catch (RuntimeException excepcion) {
            // Por ejemplo, un id de usuario que ya no existe en la base de
            // datos: se trata igual que un token invalido.
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
