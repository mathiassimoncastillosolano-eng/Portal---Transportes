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
 * Crea y valida los JWT del login. El token lleva solo lo necesario:
 * sub: id del usuario.
 * correo: correo del usuario.
 * jti: id único del token (para poder cerrarlo con logout).
 * iat / exp: cuándo se creó y cuándo vence.
 * El token no se guarda en ninguna tabla.
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

    /** Crea un JWT firmado (HS256) para el usuario. */
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
     * Valida la firma y el vencimiento y devuelve los datos del token. Si no es válido lanza JwtException (por
     * ejemplo ExpiredJwtException).
     */
    public Claims validarYObtenerClaims(String token) {
        return Jwts.parser()
                .verifyWith(claveFirma)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Lee el id del usuario del campo "sub". */
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
