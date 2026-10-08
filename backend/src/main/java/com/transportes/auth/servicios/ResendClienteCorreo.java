package com.transportes.auth.servicios;

import com.transportes.auth.excepciones.CorreoNoDisponibleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Envio de correo mediante la API oficial de Resend ({@code POST /emails}).
 *
 * <p>Usa el {@link HttpClient} del JDK, asi que no anade dependencias. La clave de la
 * API y el remitente llegan por variables de entorno ({@code RESEND_API_KEY},
 * {@code RESEND_FROM}); la clave solo viaja en la cabecera Authorization y jamas se
 * registra. Solo se considera enviado un correo si Resend responde 2xx.</p>
 */
@Component
public class ResendClienteCorreo implements ClienteCorreo {

    private static final Logger log = LoggerFactory.getLogger(ResendClienteCorreo.class);

    private final String apiKey;
    private final String remitente;
    private final URI endpoint;
    private final HttpClient http;

    public ResendClienteCorreo(@Value("${resend.api-key:}") String apiKey,
                               @Value("${resend.remitente:}") String remitente,
                               @Value("${resend.url-base:https://api.resend.com}") String urlBase) {
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.remitente = remitente == null ? "" : remitente.strip();
        this.endpoint = URI.create(urlBase.replaceAll("/+$", "") + "/emails");
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    }

    @Override
    public void enviar(MensajeCorreo mensaje) {
        if (apiKey.isEmpty() || remitente.isEmpty()) {
            log.error("Resend no está configurado: define RESEND_API_KEY y RESEND_FROM.");
            throw new CorreoNoDisponibleException();
        }

        HttpRequest solicitud = HttpRequest.newBuilder(endpoint)
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("User-Agent", "rutalibre-backend/1.0")
                .POST(HttpRequest.BodyPublishers.ofString(construirJson(remitente, mensaje), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> respuesta;
        try {
            respuesta = http.send(solicitud, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            log.error("No se pudo contactar con Resend ({}).", e.getClass().getSimpleName());
            throw new CorreoNoDisponibleException();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Envío a Resend interrumpido.");
            throw new CorreoNoDisponibleException();
        }

        int estado = respuesta.statusCode();
        if (estado < 200 || estado >= 300) {
            // El cuerpo de error de Resend describe el problema (dominio no verificado, clave inválida...).
            // No contiene el codigo ni la clave: se registra recortado para diagnosticar.
            log.error("Resend rechazó el envío (HTTP {}): {}", estado, recortar(respuesta.body(), 300));
            throw new CorreoNoDisponibleException();
        }
    }

    static String construirJson(String remitente, MensajeCorreo m) {
        return "{\"from\":" + cadenaJson(remitente)
                + ",\"to\":[" + cadenaJson(m.para()) + "]"
                + ",\"subject\":" + cadenaJson(m.asunto())
                + ",\"html\":" + cadenaJson(m.html())
                + ",\"text\":" + cadenaJson(m.texto()) + "}";
    }

    static String cadenaJson(String valor) {
        StringBuilder sb = new StringBuilder(valor.length() + 16).append('"');
        for (int i = 0; i < valor.length(); i++) {
            char c = valor.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20 || c == '\u2028' || c == '\u2029') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    private static String recortar(String texto, int maximo) {
        if (texto == null) {
            return "";
        }
        return texto.length() <= maximo ? texto : texto.substring(0, maximo) + "…";
    }
}
