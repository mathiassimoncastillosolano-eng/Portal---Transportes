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
 * Obtiene y guarda en memoria las claves publicas con las que Google firma
 * sus ID tokens (JWKS), identificadas por {@code kid}.
 *
 * <p>Las claves se descargan de Google solo cuando hace falta: si el
 * {@code kid} no esta en cache o el cache supero una hora. Para que un
 * atacante no pueda forzar descargas continuas con {@code kid} falsos, no se
 * vuelve a consultar a Google antes de {@link #INTERVALO_MINIMO_REFRESCO}.</p>
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
     * Devuelve la clave publica para el {@code kid} indicado, o vacio si
     * Google no publica ninguna con ese identificador.
     *
     * @throws GoogleServicioNoDisponibleException si Google no responde
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
            // Se registra el intento para no reintentar de inmediato ante un fallo.
            ultimaDescarga = Instant.now();
            throw new GoogleServicioNoDisponibleException(
                    "No se pudo contactar con Google. Intente nuevamente.", e);
        }
    }
}
