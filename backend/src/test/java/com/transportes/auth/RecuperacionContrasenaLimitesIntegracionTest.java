package com.transportes.auth;

import com.transportes.auth.servicios.ClienteCorreo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Limitacion de solicitudes: enfriamiento por correo y tope por IP. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "recuperacion.reenvio-segundos=60",
        "recuperacion.max-solicitudes-ip=3"
})
class RecuperacionContrasenaLimitesIntegracionTest {

    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @MockitoBean ClienteCorreo clienteCorreo;
    final HttpClient http = HttpClient.newHttpClient();

    HttpResponse<String> solicitar(String correo) throws Exception {
        var solicitud = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/password-reset/request"))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("correo", correo)))).build();
        return http.send(solicitud, HttpResponse.BodyHandlers.ofString());
    }

    @Test void elEnfriamientoPorCorreoYElTopePorIpDevuelven429() throws Exception {
        String a = "lim-" + UUID.randomUUID() + "@example.com";
        String b = "lim-" + UUID.randomUUID() + "@example.com";
        String c = "lim-" + UUID.randomUUID() + "@example.com";

        assertEquals(200, solicitar(a).statusCode());
        assertEquals(429, solicitar(a).statusCode()); // enfriamiento: aplica aunque la cuenta no exista
        assertEquals(200, solicitar(b).statusCode());
        assertEquals(429, solicitar(c).statusCode()); // tope de 3 solicitudes por IP
    }
}
