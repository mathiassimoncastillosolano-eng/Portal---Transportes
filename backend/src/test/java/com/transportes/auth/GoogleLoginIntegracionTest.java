package com.transportes.auth;

import com.transportes.auth.dto.IdentidadGoogle;
import com.transportes.auth.excepciones.GoogleServicioNoDisponibleException;
import com.transportes.auth.excepciones.GoogleTokenInvalidoException;
import com.transportes.auth.servicios.VerificadorTokenGoogle;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Flujo completo de Google contra la API real (H2 en modo PostgreSQL). Solo se
 * sustituye la verificacion criptografica del ID token, que se cubre aparte en
 * {@link VerificadorTokenGoogleTest}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class GoogleLoginIntegracionTest {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean VerificadorTokenGoogle verificador;
    final HttpClient http = HttpClient.newHttpClient();
    static final String CLAVE = "ClaveTradicional2026!";

    String correoNuevo() { return "google-" + UUID.randomUUID() + "@example.com"; }

    void credencial(String credencial, String googleId, String correo) {
        when(verificador.verificar(credencial))
                .thenReturn(new IdentidadGoogle(googleId, correo, "Ana", "Pérez", "Ana Pérez"));
    }

    HttpResponse<String> post(String ruta, Object cuerpo, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(builder.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo))).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> perfil(String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/usuarios/perfil"));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(builder.GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> google(String credencial) throws Exception {
        return post("/api/auth/google", Map.of("credential", credencial), null);
    }

    String token(HttpResponse<String> respuesta) throws Exception {
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        return json.readTree(respuesta.body()).get("token").asText();
    }

    int contar(String correo) {
        return jdbc.queryForObject("select count(*) from usuario where lower(correo) = lower(?)", Integer.class, correo);
    }

    void registrarTradicional(String correo) throws Exception {
        var r = post("/api/usuarios/registro",
                Map.of("nombres", "Lucas", "apellidos", "Prueba", "correo", correo, "contrasena", CLAVE), null);
        assertEquals(201, r.statusCode(), r.body());
    }

    @Test void usuarioNuevoSeCreaSinContrasenaYEntraConElMismoJwt() throws Exception {
        String correo = correoNuevo();
        credencial("cred-nuevo", "g-" + correo, correo);

        String token = token(google("cred-nuevo"));

        var fila = jdbc.queryForMap(
                "select nombres, apellidos, google_id, contrasena_hash, nro_telefono, activo from usuario where correo = ?", correo);
        assertEquals("Ana", fila.get("nombres"));
        assertEquals("Pérez", fila.get("apellidos"));
        assertEquals("g-" + correo, fila.get("google_id"));
        assertNull(fila.get("contrasena_hash"));
        assertNull(fila.get("nro_telefono"));
        assertEquals(Boolean.TRUE, fila.get("activo"));

        var perfil = perfil(token);
        assertEquals(200, perfil.statusCode(), perfil.body());
        assertEquals(correo, json.readTree(perfil.body()).get("correo").asText());
    }

    @Test void usuarioGoogleExistenteNoSeDuplica() throws Exception {
        String correo = correoNuevo();
        credencial("cred-repetido", "g-" + correo, correo);

        token(google("cred-repetido"));
        token(google("cred-repetido"));

        assertEquals(1, contar(correo));
    }

    @Test void usuarioGoogleSinContrasenaNoPuedeEntrarPorCorreoYContrasena() throws Exception {
        String correo = correoNuevo();
        credencial("cred-sin-clave", "g-" + correo, correo);
        token(google("cred-sin-clave"));

        var login = post("/api/auth/login", Map.of("correo", correo, "contrasena", "CualquierClave2026!"), null);
        assertEquals(401, login.statusCode(), login.body());
    }

    @Test void correoDeCuentaTradicionalNoSeVinculaAutomaticamente() throws Exception {
        String correo = correoNuevo();
        registrarTradicional(correo);
        credencial("cred-mismo-correo", "g-otro-" + correo, correo);

        var respuesta = google("cred-mismo-correo");

        assertEquals(409, respuesta.statusCode(), respuesta.body());
        assertEquals(1, contar(correo));
        assertNull(jdbc.queryForObject("select google_id from usuario where correo = ?", String.class, correo));
        // El login tradicional sigue funcionando igual.
        var login = post("/api/auth/login", Map.of("correo", correo, "contrasena", CLAVE), null);
        assertEquals(200, login.statusCode(), login.body());
    }

    @Test void usuarioAutenticadoPuedeVincularGoogleYLuegoEntrarConGoogle() throws Exception {
        String correo = correoNuevo();
        registrarTradicional(correo);
        String tokenTradicional = token(post("/api/auth/login", Map.of("correo", correo, "contrasena", CLAVE), null));
        credencial("cred-vincular", "g-vinculado-" + correo, correo);

        var vinculo = post("/api/auth/google/vincular", Map.of("credential", "cred-vincular"), tokenTradicional);
        assertEquals(200, vinculo.statusCode(), vinculo.body());

        assertEquals("g-vinculado-" + correo,
                jdbc.queryForObject("select google_id from usuario where correo = ?", String.class, correo));
        assertNotNull(jdbc.queryForObject("select contrasena_hash from usuario where correo = ?", String.class, correo));
        token(google("cred-vincular"));
        assertEquals(1, contar(correo));
    }

    @Test void vincularExigeSesionYElMismoCorreo() throws Exception {
        String correo = correoNuevo();
        registrarTradicional(correo);
        String tokenTradicional = token(post("/api/auth/login", Map.of("correo", correo, "contrasena", CLAVE), null));
        credencial("cred-ajeno", "g-ajeno-" + correo, "otra-persona-" + correo);

        assertEquals(401, post("/api/auth/google/vincular", Map.of("credential", "cred-ajeno"), null).statusCode());
        assertEquals(409, post("/api/auth/google/vincular", Map.of("credential", "cred-ajeno"), tokenTradicional).statusCode());
        assertNull(jdbc.queryForObject("select google_id from usuario where correo = ?", String.class, correo));
    }

    @Test void cuentaDeGoogleYaAsociadaAOtroUsuarioNoSePuedeVincular() throws Exception {
        String correoGoogle = correoNuevo();
        credencial("cred-primero", "g-compartido", correoGoogle);
        token(google("cred-primero"));

        String correo = correoNuevo();
        registrarTradicional(correo);
        String tokenTradicional = token(post("/api/auth/login", Map.of("correo", correo, "contrasena", CLAVE), null));
        credencial("cred-segundo", "g-compartido", correo);

        assertEquals(409, post("/api/auth/google/vincular", Map.of("credential", "cred-segundo"), tokenTradicional).statusCode());
    }

    @Test void credencialInvalidaOExpiradaDevuelve401() throws Exception {
        when(verificador.verificar("cred-mala")).thenThrow(new GoogleTokenInvalidoException("La credencial de Google no es valida o expiro."));
        var respuesta = google("cred-mala");
        assertEquals(401, respuesta.statusCode(), respuesta.body());
        assertTrue(json.readTree(respuesta.body()).get("mensaje").asText().contains("credencial"));
    }

    @Test void googleNoDisponibleDevuelve503() throws Exception {
        when(verificador.verificar("cred-caido")).thenThrow(
                new GoogleServicioNoDisponibleException("No se pudo contactar con Google. Intente nuevamente.", new RuntimeException()));
        assertEquals(503, google("cred-caido").statusCode());
    }

    @Test void credencialAusenteDevuelve400() throws Exception {
        assertEquals(400, post("/api/auth/google", Map.of(), null).statusCode());
        assertEquals(400, post("/api/auth/google", Map.of("credential", " "), null).statusCode());
    }

    @Test void usuarioGoogleInactivoNoEntra() throws Exception {
        String correo = correoNuevo();
        credencial("cred-inactivo", "g-" + correo, correo);
        token(google("cred-inactivo"));
        jdbc.update("update usuario set activo = false where correo = ?", correo);

        assertEquals(401, google("cred-inactivo").statusCode());
    }

    @Test void cerrarSesionInvalidaElJwtEmitidoPorGoogle() throws Exception {
        String correo = correoNuevo();
        credencial("cred-logout", "g-" + correo, correo);
        String token = token(google("cred-logout"));

        assertEquals(200, post("/api/auth/logout", Map.of(), token).statusCode());
        assertEquals(401, perfil(token).statusCode());
    }

    @Test void registroTradicionalConCorreoDeUnaCuentaGoogleDaConflicto() throws Exception {
        String correo = correoNuevo();
        credencial("cred-registrado", "g-" + correo, correo);
        token(google("cred-registrado"));

        var r = post("/api/usuarios/registro",
                Map.of("nombres", "Otro", "apellidos", "Usuario", "correo", correo, "contrasena", CLAVE), null);
        assertEquals(409, r.statusCode(), r.body());
    }

    @Test void endpointsProtegidosSiguenExigiendoJwt() throws Exception {
        assertEquals(401, perfil(null).statusCode());
        assertEquals(401, perfil("token.invalido.xyz").statusCode());
    }
}
