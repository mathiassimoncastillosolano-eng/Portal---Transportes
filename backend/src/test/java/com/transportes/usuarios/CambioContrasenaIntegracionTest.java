package com.transportes.usuarios;

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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

/** Cambio de contraseña con sesión: valida la actual y permite entrar con la nueva. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:cambiocontrasena;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,classpath:schema-empleado-test.sql"
})
@ActiveProfiles("test")
class CambioContrasenaIntegracionTest {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    final HttpClient http = HttpClient.newHttpClient();
    static final String CLAVE = "ClaveGerente2026!";
    static final String NUEVA = "NuevaClave2027!";

    String crearGerente() {
        String correo = "gerente-" + UUID.randomUUID() + "@example.com";
        jdbc.update("insert into usuario(nombres, apellidos, correo, contrasena_hash) values (?,?,?,?)",
                "Prueba", "Gerente", correo, encoder.encode(CLAVE));
        Integer idUsuario = jdbc.queryForObject("select id_usuario from usuario where correo=?", Integer.class, correo);
        jdbc.update("insert into empleado(id_usuario, rol, id_agencia) values (?,?,?)", idUsuario, "GERENTE", null);
        return correo;
    }

    HttpResponse<String> login(String correo, String clave) throws Exception {
        String cuerpo = json.writeValueAsString(Map.of("correo", correo, "contrasena", clave));
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login-empresarial"))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build(), HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> cambiar(String token, String actual, String nueva, String confirmacion) throws Exception {
        String cuerpo = json.writeValueAsString(Map.of("contrasenaActual", actual, "contrasenaNueva", nueva, "confirmacion", confirmacion));
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/usuarios/contrasena"))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(cuerpo));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    String token(HttpResponse<String> respuesta) {
        return json.readTree(respuesta.body()).get("token").asText();
    }

    @Test
    void cambiaLaContrasenaYPermiteEntrarConLaNueva() throws Exception {
        String correo = crearGerente();
        String token = token(login(correo, CLAVE));

        assertEquals(204, cambiar(token, CLAVE, NUEVA, NUEVA).statusCode());
        assertEquals(200, login(correo, NUEVA).statusCode());
        assertNotEquals(200, login(correo, CLAVE).statusCode());
    }

    @Test
    void rechazaContrasenaActualIncorrectaOConfirmacionDistinta() throws Exception {
        String correo = crearGerente();
        String token = token(login(correo, CLAVE));

        HttpResponse<String> actualMal = cambiar(token, "Incorrecta123", NUEVA, NUEVA);
        assertEquals(400, actualMal.statusCode());
        assertTrue(actualMal.body().contains("contraseña actual"));

        assertEquals(400, cambiar(token, CLAVE, NUEVA, "OtraDistinta2027!").statusCode());
        assertEquals(400, cambiar(token, CLAVE, "corta", "corta").statusCode());
        assertEquals(200, login(correo, CLAVE).statusCode());
    }

    @Test
    void exigeSesion() throws Exception {
        assertEquals(401, cambiar(null, CLAVE, NUEVA, NUEVA).statusCode());
    }
}
