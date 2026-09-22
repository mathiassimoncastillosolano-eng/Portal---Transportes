package com.transportes.usuarios;

import com.transportes.usuarios.repositorios.UsuarioRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.doAnswer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class RegistroIntegracionTest {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    @MockitoSpyBean UsuarioRepository usuarios;
    final HttpClient http = HttpClient.newHttpClient();
    static final String CLAVE = "ClaveRegistro2026!";

    String correoNuevo() { return "prueba-" + UUID.randomUUID() + "@example.com"; }

    Map<String, String> datos(String correo, String clave) {
        return Map.of("nombres", "Lucas", "apellidos", "Prueba", "correo", correo, "contrasena", clave);
    }

    HttpResponse<String> enviar(String ruta, Object datos) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(datos))).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> perfil(String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/usuarios/perfil"));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(builder.GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void registroPublicoHashYLoginConPerfilProtegido() throws Exception {
        String correo = correoNuevo();
        var registro = enviar("/api/usuarios/registro", datos("  " + correo.toUpperCase() + "  ", CLAVE));
        assertEquals(201, registro.statusCode(), registro.body());
        var respuesta = json.readTree(registro.body());
        assertEquals(correo, respuesta.get("correo").asText());
        assertFalse(registro.body().contains("contrasena"));
        assertFalse(registro.body().contains(CLAVE));
        var usuario = usuarios.findByCorreoIgnoreCase(correo).orElseThrow();
        assertTrue(encoder.matches(CLAVE, usuario.getContrasenaHash()));
        assertNull(usuario.getNroTelefono());
        assertTrue(usuario.estaActivo());
        assertNotNull(usuario.getFechaCreacion());
        assertNotNull(usuario.getFechaActualizacion());
        assertEquals(401, perfil(null).statusCode());
        var login = enviar("/api/auth/login", Map.of("correo", correo.toUpperCase(), "contrasena", CLAVE));
        assertEquals(200, login.statusCode(), login.body());
        String token = json.readTree(login.body()).get("token").asText();
        var perfil = perfil(token);
        assertEquals(200, perfil.statusCode(), perfil.body());
        assertEquals(correo, json.readTree(perfil.body()).get("correo").asText());
        assertEquals(401, enviar("/api/auth/login", Map.of("correo", correo, "contrasena", "Incorrecta2026!")).statusCode());
    }

    @Test void correoDuplicadoIncluyeMayusculasYMensaje() throws Exception {
        String correo = correoNuevo();
        assertEquals(201, enviar("/api/usuarios/registro", datos(correo, CLAVE)).statusCode());
        var repetido = enviar("/api/usuarios/registro", datos(correo.toUpperCase(), CLAVE));
        assertEquals(409, repetido.statusCode());
        assertEquals("El correo ya está registrado", json.readTree(repetido.body()).get("mensaje").asText());
        assertEquals(1, jdbc.queryForObject("select count(*) from usuario where correo=?", Integer.class, correo));
    }

    @Test void rechazaContrasenaCortaSinInsertar() throws Exception {
        String correo = correoNuevo();
        var respuesta = enviar("/api/usuarios/registro", datos(correo, "123"));
        assertEquals(400, respuesta.statusCode());
        assertTrue(respuesta.body().contains("8 caracteres"));
        assertFalse(usuarios.existsByCorreoIgnoreCase(correo));
    }

    @Test void validaCamposVaciosCorreoYLongitudes() throws Exception {
        for (var cambio : Map.of("nombres", " ", "apellidos", "a".repeat(101), "correo", "sin-arroba", "nroTelefono", "1".repeat(21)).entrySet()) {
            var solicitud = new java.util.HashMap<>(datos(correoNuevo(), CLAVE));
            solicitud.put(cambio.getKey(), cambio.getValue());
            assertEquals(400, enviar("/api/usuarios/registro", solicitud).statusCode(), cambio.getKey());
        }
        assertEquals(400, enviar("/api/usuarios/registro", Map.of()).statusCode());
    }

    @Test void limiteBCryptEsEnBytesYNoEnCaracteres() throws Exception {
        String correo = correoNuevo();
        assertEquals(400, enviar("/api/usuarios/registro", datos(correo, "ñ".repeat(37))).statusCode());
        assertFalse(usuarios.existsByCorreoIgnoreCase(correo));
        var aceptado = enviar("/api/usuarios/registro", datos(correo, "a".repeat(72)));
        assertEquals(201, aceptado.statusCode(), aceptado.body());
    }

    @Test void jsonMalformadoEs400() throws Exception {
        var respuesta = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/usuarios/registro"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{"))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(400, respuesta.statusCode());
        assertTrue(respuesta.body().contains("JSON"));
    }

    @Test void corsPermiteFormularioLocal() throws Exception {
        var respuesta = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/usuarios/registro"))
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, respuesta.statusCode());
        assertEquals("http://localhost:5173", respuesta.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
    }

    @Test void solicitudesSimultaneasCreanSoloUnaCuenta() throws Exception {
        String correo = correoNuevo();
        var barrera = new CyclicBarrier(2);
        var consultas = new AtomicInteger();
        // Fuerza ambas comprobaciones a terminar antes del primer INSERT.
        doAnswer(invocacion -> {
            boolean existe = jdbc.queryForObject(
                    "select count(*) from usuario where lower(correo)=lower(?)", Integer.class, correo) > 0;
            if (consultas.incrementAndGet() <= 2) barrera.await(10, TimeUnit.SECONDS);
            return existe;
        }).when(usuarios).existsByCorreoIgnoreCase(correo);
        var ejecutor = Executors.newFixedThreadPool(2);
        try {
            var primera = ejecutor.submit(() -> enviar("/api/usuarios/registro", datos(correo, CLAVE)));
            var segunda = ejecutor.submit(() -> enviar("/api/usuarios/registro", datos(correo.toUpperCase(), CLAVE)));
            var a = primera.get(20, TimeUnit.SECONDS);
            var b = segunda.get(20, TimeUnit.SECONDS);
            assertEquals(java.util.List.of(201, 409), java.util.stream.Stream.of(a.statusCode(), b.statusCode()).sorted().toList(), a.body() + b.body());
            assertTrue((a.statusCode() == 409 ? a.body() : b.body()).contains("El correo ya está registrado"));
            assertEquals(1, jdbc.queryForObject("select count(*) from usuario where correo=?", Integer.class, correo));
        } finally {
            ejecutor.shutdownNow();
        }
    }
}
