package com.transportes.security.configuracion;

import com.transportes.security.servicios.JwtService;
import com.transportes.security.servicios.TokenInvalidadoService;
import com.transportes.usuarios.servicios.UsuarioService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuracion central de Spring Security para toda la API.
 *
 * <p>Decisiones clave:</p>
 * <ul>
 *     <li>API sin estado (stateless): no se usan sesiones HTTP, toda la
 *         autenticacion viaja en el JWT.</li>
 *     <li>CSRF deshabilitado: es irrelevante para una API sin estado
 *         consumida por un frontend SPA con Bearer tokens (no usa
 *         cookies de sesion).</li>
 *     <li>Login y POST /api/usuarios/registro son publicos.
 *         El resto de rutas bajo {@code /api/usuarios/**} y
 *         {@code /api/auth/logout} requieren un JWT valido.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
public class ConfiguracionSeguridad {

    private final JwtService jwtService;
    private final TokenInvalidadoService tokenInvalidadoService;
    private final UsuarioService usuarioService;
    private final PuntoEntradaJwt puntoEntradaJwt;

    @Value("${seguridad.cors.origenes-permitidos}")
    private String origenesPermitidos;

    public ConfiguracionSeguridad(JwtService jwtService,
                                   TokenInvalidadoService tokenInvalidadoService,
                                   UsuarioService usuarioService,
                                   PuntoEntradaJwt puntoEntradaJwt) {
        this.jwtService = jwtService;
        this.tokenInvalidadoService = tokenInvalidadoService;
        this.usuarioService = usuarioService;
        this.puntoEntradaJwt = puntoEntradaJwt;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain cadenaFiltrosSeguridad(HttpSecurity http) throws Exception {
        FiltroAutenticacionJwt filtroJwt =
                new FiltroAutenticacionJwt(jwtService, tokenInvalidadoService, usuarioService);

        http
                .cors(cors -> cors.configurationSource(fuenteConfiguracionCors()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(manejo -> manejo.authenticationEntryPoint(puntoEntradaJwt))
                .authorizeHttpRequests(rutas -> rutas
                        // Crear una cuenta no requiere una sesion previa.
                        .requestMatchers(HttpMethod.POST, "/api/usuarios/registro").permitAll()
                        .requestMatchers("/api/auth/login").permitAll()
                        // Perfil y cierre de sesion: requieren JWT valido.
                        .requestMatchers("/api/usuarios/**", "/api/auth/logout").authenticated()
                        // Cualquier otra ruta (dominios aun no implementados,
                        // como destinos/servicios/viajes) permanece publica por
                        // ahora, ya que estan fuera del alcance de esta tarea.
                        .anyRequest().permitAll()
                )
                .addFilterBefore(filtroJwt, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private CorsConfigurationSource fuenteConfiguracionCors() {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOrigins(List.of(origenesPermitidos.split(",")));
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuracion.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", configuracion);
        return fuente;
    }
}
