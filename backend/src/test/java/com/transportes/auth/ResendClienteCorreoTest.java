package com.transportes.auth.servicios;

import com.sun.net.httpserver.HttpServer;
import com.transportes.auth.excepciones.CorreoNoDisponibleException;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/** Prueba el cliente de Resend contra un servidor HTTP local (nunca contacta con Resend real). */
class ResendClienteCorreoTest {

    record Capturada(String metodo, String ruta, String autorizacion, String userAgent, String cuerpo) {}

    private HttpServer servidor(int estado, String respuesta, AtomicReference<Capturada> destino) throws Exception {
        HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        s.createContext("/", intercambio -> {
            byte[] cuerpo = intercambio.getRequestBody().readAllBytes();
            destino.set(new Capturada(intercambio.getRequestMethod(), intercambio.getRequestURI().getPath(),
                    intercambio.getRequestHeaders().getFirst("Authorization"),
                    intercambio.getRequestHeaders().getFirst("User-Agent"),
                    new String(cuerpo, StandardCharsets.UTF_8)));
            byte[] salida = respuesta.getBytes(StandardCharsets.UTF_8);
            intercambio.sendResponseHeaders(estado, salida.length);
            intercambio.getResponseBody().write(salida);
            intercambio.close();
        });
        s.start();
        return s;
    }

    private String base(HttpServer s) {
        return "http://127.0.0.1:" + s.getAddress().getPort();
    }

    final MensajeCorreo mensaje = new MensajeCorreo("ana@example.com", "Asunto \"con comillas\"",
            "<p>Hola</p>\n<b>línea</b>", "Hola\ntexto");

    @Test void enviaLaPeticionEsperadaYAceptaUn200() throws Exception {
        var capturada = new AtomicReference<Capturada>();
        HttpServer s = servidor(200, "{\"id\":\"abc\"}", capturada);
        try {
            new ResendClienteCorreo("re_clave_de_prueba", "RutaLibre <no-reply@ejemplo.com>", base(s)).enviar(mensaje);
        } finally {
            s.stop(0);
        }
        var c = capturada.get();
        assertEquals("POST", c.metodo());
        assertEquals("/emails", c.ruta());
        assertEquals("Bearer re_clave_de_prueba", c.autorizacion());
        assertNotNull(c.userAgent());
        assertTrue(c.cuerpo().contains("\"from\":\"RutaLibre <no-reply@ejemplo.com>\""), c.cuerpo());
        assertTrue(c.cuerpo().contains("\"to\":[\"ana@example.com\"]"), c.cuerpo());
        assertTrue(c.cuerpo().contains("\"subject\":\"Asunto \\\"con comillas\\\"\""), c.cuerpo());
        assertTrue(c.cuerpo().contains("<p>Hola</p>\\n<b>línea</b>"), c.cuerpo());
    }

    @Test void unaRespuestaDeErrorDelProveedorSeConvierteEnCorreoNoDisponible() throws Exception {
        var capturada = new AtomicReference<Capturada>();
        HttpServer s = servidor(403, "{\"name\":\"validation_error\",\"message\":\"dominio no verificado\"}", capturada);
        try {
            var cliente = new ResendClienteCorreo("re_clave", "RutaLibre <no-reply@ejemplo.com>", base(s));
            assertThrows(CorreoNoDisponibleException.class, () -> cliente.enviar(mensaje));
        } finally {
            s.stop(0);
        }
    }

    @Test void unErrorDelProveedor5xxTambienFalla() throws Exception {
        var capturada = new AtomicReference<Capturada>();
        HttpServer s = servidor(500, "{}", capturada);
        try {
            var cliente = new ResendClienteCorreo("re_clave", "RutaLibre <no-reply@ejemplo.com>", base(s));
            assertThrows(CorreoNoDisponibleException.class, () -> cliente.enviar(mensaje));
        } finally {
            s.stop(0);
        }
    }

    @Test void sinConexionFallaSinFiltrarDetalles() {
        // Puerto 1: nadie escucha.
        var cliente = new ResendClienteCorreo("re_clave", "RutaLibre <no-reply@ejemplo.com>", "http://127.0.0.1:1");
        assertThrows(CorreoNoDisponibleException.class, () -> cliente.enviar(mensaje));
    }

    @Test void sinConfiguracionNoIntentaEnviarNada() throws Exception {
        var capturada = new AtomicReference<Capturada>();
        HttpServer s = servidor(200, "{}", capturada);
        try {
            assertThrows(CorreoNoDisponibleException.class,
                    () -> new ResendClienteCorreo("", "RutaLibre <no-reply@ejemplo.com>", base(s)).enviar(mensaje));
            assertThrows(CorreoNoDisponibleException.class,
                    () -> new ResendClienteCorreo("re_clave", "  ", base(s)).enviar(mensaje));
        } finally {
            s.stop(0);
        }
        assertNull(capturada.get());
    }

    @Test void elJsonEscapaCaracteresDeControl() {
        assertEquals("\"a\\\"b\\\\c\\nd\\u0001\"", ResendClienteCorreo.cadenaJson("a\"b\\c\nd\u0001"));
    }
}
