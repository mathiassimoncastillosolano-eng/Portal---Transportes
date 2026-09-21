package com.transportes.security.servicios;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Responsable exclusivo de generar y validar los JSON Web Tokens (JWT)
 * utilizados para autenticar a los usuarios de RutaLibre.
 *
 * El token contiene unicamente lo indispensable para identificar al usuario
 * autenticado:
 * <ul>
 *     <li>{@code sub}: id del usuario (id_usuario)</li>
 *     <li>{@code correo}: correo del usuario, para uso rapido sin volver a
 *         consultar la base de datos en cada peticion</li>
 *     <li>{@code jti}: identificador unico del token, usado para poder
 *         invalidarlo en el cierre de sesion (ver {@link TokenInvalidadoService})</li>
 *     <li>{@code iat} / {@code exp}: fecha de emision y de expiracion</li>
 * </ul>
 *
 * No se persiste el JWT en ninguna tabla: la informacion real del usuario
 * continua almacenada exclusivamente en PostgreSQL.
 */
@Service
public class JwtService {

    private final SecretKey claveFirma;
    private final long expiracionMinutos;

    public JwtService(
            @Value("${security.jwt.clave-secreta}") String claveSecreta,
            @Value("${security.jwt.expiracion-minutos}") long expiracionMinutos
    ) {
        this.claveFirma = Keys.hmacShaKeyFor(claveSecreta.getBytes(StandardCharsets.UTF_8));
        this.expiracionMinutos = expiracionMinutos;
    }

    /**
     * Genera un JWT firmado (HS256) para el usuario indicado.
     */
    public String generarToken(Integer idUsuario, String correo) {
        Instant ahora = Instant.now();
        Instant expiracion = ahora.plusSeconds(expiracionMinutos * 60);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(idUsuario))
                .claim("correo", correo)
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(expiracion))
                .signWith(claveFirma)
                .compact();
    }

    /**
     * Valida la firma y la expiracion del token y devuelve sus claims.
     * Lanza {@link JwtException} (o una subclase, como
     * {@link ExpiredJwtException}) si el token no es valido.
     */
    public Claims validarYObtenerClaims(String token) {
        return Jwts.parser()
                .verifyWith(claveFirma)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Integer obtenerIdUsuario(Claims claims) {
        return Integer.valueOf(claims.getSubject());
    }

    public String obtenerCorreo(Claims claims) {
        return claims.get("correo", String.class);
    }

    public String obtenerJti(Claims claims) {
        return claims.getId();
    }

    public Instant obtenerExpiracion(Claims claims) {
        return claims.getExpiration().toInstant();
    }
}
