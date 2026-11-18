package com.transportes.viajes.servicios;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.transportes.viajes.excepciones.SesionExpiradaException;
import com.transportes.viajes.excepciones.SesionInvalidaException;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/** Crea y valida el token de la sesión de reserva. */
@Service
public class TokenSesionServicio {

    private static final String TIPO_SESION = "sesion";

    private final SecretKey clave;
    private final long minutosSesion;

    public TokenSesionServicio(
            @Value("${reserva.token-secreto}") String secreto,
            @Value("${reserva.bloqueo-minutos:15}") long minutosSesion) {
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("reserva.token-secreto debe tener al menos 32 caracteres");
        }
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.minutosSesion = minutosSesion;
    }

    /** Datos de una sesión de reserva. idSesion (un UUID) es lo que se guarda en viaje_asiento.token_bloqueo. */
    public record SesionReserva(String tokenSesion, String idSesion, Long idViaje, LocalDateTime fechaExpiracion) {
        public long segundosRestantes() {
            return Math.max(0, Duration.between(LocalDateTime.now(), fechaExpiracion).getSeconds());
        }
    }

    public SesionReserva crear(Long idViaje) {
        return crear(idViaje, null);
    }

    /** Crea una sesión nueva con su id y su vencimiento (como máximo los minutos configurados). */
    public SesionReserva crear(Long idViaje, Integer minutosSolicitados) {
        long minutos = minutosSolicitados == null ? minutosSesion : Math.max(1, Math.min(minutosSolicitados, minutosSesion));
        Instant ahora = Instant.now();
        Instant expira = ahora.plus(Duration.ofMinutes(minutos));
        String idSesion = UUID.randomUUID().toString();

        String token = Jwts.builder()
                .id(idSesion)
                .subject("sesion-reserva")
                .claim("tipo", TIPO_SESION)
                .claim("idViaje", idViaje)
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(expira))
                .signWith(clave)
                .compact();

        return new SesionReserva(token, idSesion, idViaje, aLocal(expira));
    }

    /** Crea un token nuevo para la misma sesión con otro vencimiento. */
    public SesionReserva reemitir(String idSesion, Long idViaje, LocalDateTime nuevaExpiracion) {
        Instant ahora = Instant.now();
        Instant expira = nuevaExpiracion.atZone(ZoneId.systemDefault()).toInstant();
        String token = Jwts.builder()
                .id(idSesion)
                .subject("sesion-reserva")
                .claim("tipo", TIPO_SESION)
                .claim("idViaje", idViaje)
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(expira))
                .signWith(clave)
                .compact();
        return new SesionReserva(token, idSesion, idViaje, aLocal(expira));
    }

    /** Valida el token de la sesión de reserva. Lanza error si venció o no es válido. */
    public SesionReserva validar(String token, Long idViaje) {
        try {
            Claims c = Jwts.parser().verifyWith(clave).build()
                    .parseSignedClaims(token).getPayload();

            if (!TIPO_SESION.equals(c.get("tipo", String.class))) {
                throw new SesionInvalidaException("Token de sesión inválido");
            }
            Number viajeToken = c.get("idViaje", Number.class);
            if (viajeToken == null || viajeToken.longValue() != idViaje) {
                throw new SesionInvalidaException("El token no corresponde a este viaje");
            }
            return new SesionReserva(token, c.getId(), idViaje, aLocal(c.getExpiration().toInstant()));

        } catch (ExpiredJwtException e) {
            throw new SesionExpiradaException();
        } catch (JwtException | IllegalArgumentException e) {
            throw new SesionInvalidaException("Token de sesión inválido");
        }
    }

    private LocalDateTime aLocal(Instant i) {
        return LocalDateTime.ofInstant(i, ZoneId.systemDefault());
    }
}