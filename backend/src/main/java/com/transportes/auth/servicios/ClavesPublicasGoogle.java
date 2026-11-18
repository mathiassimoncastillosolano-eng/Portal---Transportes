package com.transportes.auth.servicios;

import com.transportes.auth.excepciones.GoogleServicioNoDisponibleException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Descarga y guarda en memoria las claves públicas con las que Google firma sus ID tokens (cada una tiene un
 * "kid").
 * Solo vuelve a descargar si falta un kid o pasó una hora, y nunca antes del intervalo mínimo: así nadie puede
 * forzar descargas enviando kid falsos.
 */
@Component
public class ClavesPublicasGoogle {

    private static final Duration VIGENCIA_CACHE = Duration.ofHours(1);
    private static final Duration INTERVALO_MINIMO_REFRESCO = Duration.ofMinutes(1);

    private final ObjectMapper objectMapper;
    private final String urlJwks;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private Map<String, PublicKey> claves = Map.of();
    private Instant ultimaDescarga = Instant.EPOCH;

    public ClavesPublicasGoogle(ObjectMapper objectMapper,
                                @Value("${google.jwks-url:https://www.googleapis.com/oauth2/v3/certs}") String urlJwks) {
        this.objectMapper = objectMapper;
        this.urlJwks = urlJwks;
    }

    /**
     * La clave pública de ese kid, o vacío si Google no tiene ninguna con ese id. Si Google no responde ->
     * GoogleServicioNoDisponibleException.
     */
    public synchronized Optional<PublicKey> obtener(String kid) {
        if (kid == null || kid.isBlank()) {
            return Optional.empty();
        }
        Instant ahora = Instant.now();
        boolean cacheVencido = ultimaDescarga.plus(VIGENCIA_CACHE).isBefore(ahora);
        boolean puedeRefrescar = ultimaDescarga.plus(INTERVALO_MINIMO_REFRESCO).isBefore(ahora);

        if ((cacheVencido || !claves.containsKey(kid)) && puedeRefrescar) {
            descargar();
        }
        return Optional.ofNullable(claves.get(kid));
    }

    private void descargar() {
        try {
            HttpRequest solicitud = HttpRequest.newBuilder(URI.create(urlJwks))
                    .timeout(Duration.ofSeconds(5))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> respuesta = http.send(solicitud, HttpResponse.BodyHandlers.ofString());
            if (respuesta.statusCode() != 200) {
                throw new IOException("Google respondio " + respuesta.statusCode());
            }

            Map<String, PublicKey> nuevas = new HashMap<>();
            KeyFactory fabrica = KeyFactory.getInstance("RSA");
            for (JsonNode clave : objectMapper.readTree(respuesta.body()).path("keys")) {
                if (!"RSA".equals(clave.path("kty").asText())) {
                    continue;
                }
                BigInteger modulo = new BigInteger(1, Base64.getUrlDecoder().decode(clave.path("n").asText()));
                BigInteger exponente = new BigInteger(1, Base64.getUrlDecoder().decode(clave.path("e").asText()));
                nuevas.put(clave.path("kid").asText(),
                        fabrica.generatePublic(new RSAPublicKeySpec(modulo, exponente)));
            }
            claves = Map.copyOf(nuevas);
            ultimaDescarga = Instant.now();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GoogleServicioNoDisponibleException(
                    "No se pudo contactar con Google. Intente nuevamente.", e);
        } catch (IOException | GeneralSecurityException | RuntimeException e) {
            // Se anota la hora del intento aunque falle, para no reintentar enseguida.
            ultimaDescarga = Instant.now();
            throw new GoogleServicioNoDisponibleException(
                    "No se pudo contactar con Google. Intente nuevamente.", e);
        }
    }
}
