package com.transportes.viajes.servicios;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Consulta de DNI en ApiPeru ({@code GET /api/dni/{dni}}). El token vive solo en el servidor
 * ({@code DNI_API_TOKEN}), viaja en la cabecera Authorization y jamás se registra ni llega al navegador.
 * Sin token o ante cualquier fallo devuelve vacío y el formulario pide los datos manualmente.
 */
@Component
public class ApiPeruClienteDni implements ClienteDni {

    private static final Logger log = LoggerFactory.getLogger(ApiPeruClienteDni.class);

    private final String token;
    private final String urlBase;
    private final ObjectMapper objectMapper;
    private final HttpClient http;

    public ApiPeruClienteDni(@Value("${dni.apiperu.token:}") String token,
                             @Value("${dni.apiperu.url-base:https://apiperu.dev}") String urlBase,
                             ObjectMapper objectMapper) {
        this.token = token == null ? "" : token.strip();
        this.urlBase = urlBase.replaceAll("/+$", "");
        this.objectMapper = objectMapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    @Override
    public Optional<DatosDni> consultar(String dni) {
        if (token.isEmpty()) {
            log.warn("ApiPeru no está configurado: define DNI_API_TOKEN para autocompletar nombres.");
            return Optional.empty();
        }
        HttpRequest solicitud = HttpRequest.newBuilder(URI.create(urlBase + "/api/dni/" + dni))
                .timeout(Duration.ofSeconds(8))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> respuesta = http.send(solicitud, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (respuesta.statusCode() < 200 || respuesta.statusCode() >= 300) {
                log.warn("ApiPeru respondió HTTP {} al consultar un DNI.", respuesta.statusCode());
                return Optional.empty();
            }
            return interpretar(objectMapper.readTree(respuesta.body()));
        } catch (IOException e) {
            log.warn("No se pudo consultar ApiPeru ({}).", e.getClass().getSimpleName());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (RuntimeException e) {
            log.warn("Respuesta de ApiPeru no interpretable ({}).", e.getClass().getSimpleName());
        }
        return Optional.empty();
    }

    /** Usa nombres + apellido_paterno/materno; si faltan, parte {@code nombre_completo} ("APELLIDOS, NOMBRES"). */
    static Optional<DatosDni> interpretar(JsonNode raiz) {
        JsonNode data = raiz.path("data");
        if (!raiz.path("success").asBoolean(false) || !data.isObject()) {
            return Optional.empty();
        }
        String nombres = data.path("nombres").asString("").strip();
        String apellidos = (data.path("apellido_paterno").asString("") + " "
                + data.path("apellido_materno").asString("")).strip();
        if (nombres.isEmpty() || apellidos.isEmpty()) {
            String[] partes = data.path("nombre_completo").asString("").split(",", 2);
            if (partes.length == 2) {
                apellidos = partes[0].strip();
                nombres = partes[1].strip();
            }
        }
        return nombres.isEmpty() || apellidos.isEmpty() ? Optional.empty() : Optional.of(new DatosDni(nombres, apellidos));
    }
}
