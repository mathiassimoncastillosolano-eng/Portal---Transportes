package com.transportes.security.configuracion;

import com.transportes.empleados.servicios.EmpleadoService;
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

/** Configura la seguridad: qué rutas son públicas, cuáles piden iniciar sesión y cuáles piden un rol. */
@Configuration
@EnableWebSecurity
public class ConfiguracionSeguridad {

        private final JwtService jwtService;
        private final TokenInvalidadoService tokenInvalidadoService;
        private final UsuarioService usuarioService;
        private final PuntoEntradaJwt puntoEntradaJwt;
        private final EmpleadoService empleadoService;

        @Value("${seguridad.cors.origenes-permitidos}")
        private String origenesPermitidos;

        public ConfiguracionSeguridad(JwtService jwtService,
                        TokenInvalidadoService tokenInvalidadoService,
                        UsuarioService usuarioService,
                        PuntoEntradaJwt puntoEntradaJwt,
                        EmpleadoService empleadoService) {
                this.jwtService = jwtService;
                this.tokenInvalidadoService = tokenInvalidadoService;
                this.usuarioService = usuarioService;
                this.puntoEntradaJwt = puntoEntradaJwt;
                this.empleadoService = empleadoService;
        }

        /** BCrypt para guardar y comparar contraseñas. */
        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        /** Reglas de acceso. Se revisan de arriba abajo y gana la primera que coincide. */
        @Bean
        public SecurityFilterChain cadenaFiltrosSeguridad(HttpSecurity http) throws Exception {
                FiltroAutenticacionJwt filtroJwt = new FiltroAutenticacionJwt(jwtService, tokenInvalidadoService,
                                usuarioService, empleadoService);

                http
                                .cors(cors -> cors.configurationSource(fuenteConfiguracionCors()))
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(
                                                sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .exceptionHandling(manejo -> manejo.authenticationEntryPoint(puntoEntradaJwt))
                                .authorizeHttpRequests(rutas -> rutas
                                                // Documentación Swagger: pública.
                                                .requestMatchers(
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html",
                                                                "/v3/api-docs/**",
                                                                "/v3/api-docs.yaml")
                                                .permitAll()

                                                // Salud del backend: pública (la usan Render y la pantalla de
                                                // carga del frontend).
                                                .requestMatchers(HttpMethod.GET, "/api/health/live",
                                                                "/api/health/ready")
                                                .permitAll()

                                                // Registro de cuenta: público.
                                                .requestMatchers(HttpMethod.POST, "/api/usuarios/registro").permitAll()

                                                // La regla de registro está repetida (no cambia nada). Login del
                                                // Portal: público.
                                                .requestMatchers(HttpMethod.POST, "/api/usuarios/registro").permitAll()
                                                .requestMatchers("/api/auth/login").permitAll()
                                                // Login del Sistema Empresarial: público; el servicio rechaza a
                                                // quien no sea empleado.
                                                .requestMatchers(HttpMethod.POST, "/api/auth/login-empresarial")
                                                .permitAll()
                                                // Login o registro con Google: público; el servicio valida el
                                                // token de Google.
                                                .requestMatchers(HttpMethod.POST, "/api/auth/google").permitAll()
                                                // Recuperar contraseña: público; lo que autoriza es el código
                                                // enviado al correo.
                                                .requestMatchers(HttpMethod.POST, "/api/auth/password-reset/**")
                                                .permitAll()
                                                // Perfil, logout y vincular Google: piden sesión (JWT).
                                                .requestMatchers("/api/usuarios/**", "/api/auth/logout",
                                                                "/api/auth/google/vincular")
                                                .authenticated()
                                                // Buscar pasajeros por DNI: pide sesión porque devuelve datos
                                                // personales.
                                                .requestMatchers("/api/pasajeros/**").authenticated()
                                                // Libro de Reclamaciones: público; ver una constancia pide el
                                                // token de la constancia.
                                                .requestMatchers(HttpMethod.POST, "/api/reclamos").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/reclamos/**").permitAll()
                                                // Panel de clientes del Sistema Empresarial: solo roles AGENCIA o
                                                // GERENTE (datos personales).
                                                .requestMatchers("/api/clientes/**").hasAnyRole("AGENCIA", "GERENTE")
                                                .requestMatchers("/api/pasajes/**").hasAnyRole("AGENCIA", "GERENTE")
                                                .requestMatchers(HttpMethod.GET, "/api/pagos/configuracion").permitAll()
                                                // Pagos: piden sesión (la compra queda a nombre del usuario).
                                                .requestMatchers("/api/pagos/**").authenticated()
                                                // Todo lo demás es público (búsqueda de viajes, destinos,
                                                // servicios, asientos...).
                                                .anyRequest().permitAll())
                                .addFilterBefore(filtroJwt, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        private CorsConfigurationSource fuenteConfiguracionCors() {
                CorsConfiguration configuracion = new CorsConfiguration();
                configuracion.setAllowedOrigins(List.of(origenesPermitidos.split(",")).stream()
                                .map(String::trim).filter(origen -> !origen.isEmpty() && !"*".equals(origen)).toList());
                configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                configuracion.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Token-Consulta"));
                configuracion.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
                fuente.registerCorsConfiguration("/**", configuracion);
                return fuente;
        }
}
