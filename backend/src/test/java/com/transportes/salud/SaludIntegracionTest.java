package com.transportes.salud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

/** Health checks con el contexto completo (H2 en lugar de Supabase). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SaludIntegracionTest {

    @LocalServerPort
    int port;

    final HttpClient http = HttpClient.newHttpClient();

    HttpResponse<String> get(String ruta, String origen, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(10)).GET();
        if (origen != null) builder.header("Origin", origen);
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void liveRespondeUpSinAutenticacion() throws Exception {
        var respuesta = get("/api/health/live", null, null);

        assertEquals(200, respuesta.statusCode());
        assertEquals("{\"status\":\"UP\"}", respuesta.body());
        assertTrue(respuesta.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
    }

    @Test
    void readyRespondeReadyConLaBaseDisponible() throws Exception {
        var respuesta = get("/api/health/ready", null, null);

        assertEquals(200, respuesta.statusCode());
        assertEquals("{\"status\":\"READY\"}", respuesta.body());
        assertTrue(respuesta.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
    }

    @Test
    void readyPermiteCorsDesdeElFrontendConfigurado() throws Exception {
        var respuesta = get("/api/health/ready", "http://localhost:5173", null);

        assertEquals(200, respuesta.statusCode());
        assertEquals("http://localhost:5173",
                respuesta.headers().firstValue("Access-Control-Allow-Origin").orElse(null));
    }

    @Test
    void unTokenInvalidoNoBloqueaElHealthCheck() throws Exception {
        var respuesta = get("/api/health/ready", null, "token-caducado-o-invalido");

        assertEquals(200, respuesta.statusCode());
    }

    @Test
    void noSeExponeInformacionDeInfraestructura() throws Exception {
        String cuerpo = get("/api/health/ready", null, null).body().toLowerCase();

        assertFalse(cuerpo.contains("jdbc"));
        assertFalse(cuerpo.contains("h2"));
        assertFalse(cuerpo.contains("postgres"));
    }
}
