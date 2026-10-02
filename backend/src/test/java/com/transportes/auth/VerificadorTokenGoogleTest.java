package com.transportes.auth;

import com.transportes.auth.dto.IdentidadGoogle;
import com.transportes.auth.excepciones.GoogleServicioNoDisponibleException;
import com.transportes.auth.excepciones.GoogleTokenInvalidoException;
import com.transportes.auth.servicios.ClavesPublicasGoogle;
import com.transportes.auth.servicios.VerificadorTokenGoogle;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Valida el ID token de Google con un par de claves RSA generado para la prueba. */
class VerificadorTokenGoogleTest {

    static final String CLIENT_ID = "cliente-de-prueba.apps.googleusercontent.com";
    static final String EMISOR = "https://accounts.google.com";

    KeyPair claveGoogle;
    VerificadorTokenGoogle verificador;

    @BeforeEach
    void preparar() throws Exception {
        claveGoogle = nuevoPar();
        ClavesPublicasGoogle claves = mock(ClavesPublicasGoogle.class);
        when(claves.obtener("kid-1")).thenReturn(Optional.of(claveGoogle.getPublic()));
        when(claves.obtener("kid-caido")).thenThrow(
                new GoogleServicioNoDisponibleException("Google no responde", new RuntimeException()));
        verificador = new VerificadorTokenGoogle(claves, CLIENT_ID);
    }

    static KeyPair nuevoPar() throws Exception {
        KeyPairGenerator generador = KeyPairGenerator.getInstance("RSA");
        generador.initialize(2048);
        return generador.generateKeyPair();
    }

    String token(PrivateKey clave, String kid, String emisor, String audiencia,
                 long segundosParaExpirar, Object correoVerificado) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .header().keyId(kid).and()
                .issuer(emisor)
                .audience().add(audiencia).and()
                .subject("1234567890")
                .claim("email", "Ana.Perez@Gmail.com")
                .claim("email_verified", correoVerificado)
                .claim("given_name", "Ana")
                .claim("family_name", "Pérez")
                .claim("name", "Ana Pérez")
                .issuedAt(Date.from(ahora.minusSeconds(30)))
                .expiration(Date.from(ahora.plusSeconds(segundosParaExpirar)))
                .signWith(clave, Jwts.SIG.RS256)
                .compact();
    }

    String tokenValido() {
        return token(claveGoogle.getPrivate(), "kid-1", EMISOR, CLIENT_ID, 600, true);
    }

    @Test
    void tokenValidoDevuelveLaIdentidad() {
        IdentidadGoogle identidad = verificador.verificar(tokenValido());
        assertEquals("1234567890", identidad.googleId());
        assertEquals("ana.perez@gmail.com", identidad.correo());
        assertEquals("Ana", identidad.nombres());
        assertEquals("Pérez", identidad.apellidos());
        assertEquals("Ana Pérez", identidad.nombreCompleto());
    }

    @Test
    void aceptaElEmisorSinEsquema() {
        String token = token(claveGoogle.getPrivate(), "kid-1", "accounts.google.com", CLIENT_ID, 600, true);
        assertEquals("1234567890", verificador.verificar(token).googleId());
    }

    @Test
    void rechazaAudienciaDeOtraAplicacion() {
        String token = token(claveGoogle.getPrivate(), "kid-1", EMISOR, "otra-app.apps.googleusercontent.com", 600, true);
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar(token));
    }

    @Test
    void rechazaEmisorQueNoEsGoogle() {
        String token = token(claveGoogle.getPrivate(), "kid-1", "https://evil.example.com", CLIENT_ID, 600, true);
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar(token));
    }

    @Test
    void rechazaTokenExpirado() {
        String token = token(claveGoogle.getPrivate(), "kid-1", EMISOR, CLIENT_ID, -600, true);
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar(token));
    }

    @Test
    void rechazaFirmaDeOtraClave() throws Exception {
        String token = token(nuevoPar().getPrivate(), "kid-1", EMISOR, CLIENT_ID, 600, true);
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar(token));
    }

    @Test
    void rechazaKidDesconocido() {
        String token = token(claveGoogle.getPrivate(), "kid-desconocido", EMISOR, CLIENT_ID, 600, true);
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar(token));
    }

    @Test
    void rechazaCorreoNoVerificado() {
        String token = token(claveGoogle.getPrivate(), "kid-1", EMISOR, CLIENT_ID, 600, false);
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar(token));
    }

    @Test
    void rechazaTokenFirmadoConHmac() {
        var claveHmac = Keys.hmacShaKeyFor("una-clave-hmac-de-al-menos-32-bytes-para-la-prueba".getBytes());
        String token = Jwts.builder()
                .header().keyId("kid-1").and()
                .issuer(EMISOR).audience().add(CLIENT_ID).and()
                .subject("1234567890").claim("email", "a@b.com").claim("email_verified", true)
                .expiration(Date.from(Instant.now().plusSeconds(600)))
                .signWith(claveHmac).compact();
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar(token));
    }

    @Test
    void rechazaTextoQueNoEsUnJwt() {
        assertThrows(GoogleTokenInvalidoException.class, () -> verificador.verificar("esto-no-es-un-jwt"));
    }

    @Test
    void propagaLaIndisponibilidadDeGoogle() {
        String token = token(claveGoogle.getPrivate(), "kid-caido", EMISOR, CLIENT_ID, 600, true);
        assertThrows(GoogleServicioNoDisponibleException.class, () -> verificador.verificar(token));
    }
}
