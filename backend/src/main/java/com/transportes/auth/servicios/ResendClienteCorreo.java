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
 * Envía correos con la API de Resend (POST /emails) usando el HttpClient del JDK.
 * La clave y el remitente vienen de variables de entorno (RESEND_API_KEY, RESEND_FROM). La clave solo viaja en la
 * cabecera Authorization y nunca se escribe en los logs. El correo cuenta como enviado solo si Resend responde
 * 2xx.
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

    /** Envía el correo; si Resend no responde 2xx lanza CorreoNoDisponibleException. */
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
            // El error de Resend explica el problema (dominio no verificado, clave inválida...). No contiene el
            // código ni la clave, así que se registra recortado para poder diagnosticar.
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
