package com.transportes.pagos.mercadopago;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** Cliente HTTP contra un servidor local que imita la API de Orders (sin red real). */
class ClienteMercadoPagoHttpTest {

    final ObjectMapper json = JsonMapper.builder().build();
    HttpServer servidor;
    final List<Map<String, String>> solicitudes = new ArrayList<>();
    final Map<String, Respuesta> respuestas = new ConcurrentHashMap<>();
    ClienteMercadoPagoHttp cliente;

    record Respuesta(int estado, String cuerpo, long demoraMs) {
    }

    @BeforeEach
    void iniciar() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/", this::atender);
        servidor.start();
        cliente = new ClienteMercadoPagoHttp("TEST-token-falso", "http://127.0.0.1:" + servidor.getAddress().getPort(), 2, json);
    }

    @AfterEach
    void detener() {
        servidor.stop(0);
    }

    void atender(HttpExchange ex) throws IOException {
        String cuerpo = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        synchronized (solicitudes) {
            solicitudes.add(Map.of("metodo", ex.getRequestMethod(), "ruta", ex.getRequestURI().toString(),
                    "auth", String.valueOf(ex.getRequestHeaders().getFirst("Authorization")),
                    "idem", String.valueOf(ex.getRequestHeaders().getFirst("X-Idempotency-Key")), "cuerpo", cuerpo));
        }
        Respuesta r = respuestas.getOrDefault(ex.getRequestMethod() + " " + ex.getRequestURI().getPath(),
                new Respuesta(404, "{\"errors\":[{\"code\":\"not_found\"}]}", 0));
        try {
            Thread.sleep(r.demoraMs());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        byte[] bytes = r.cuerpo().getBytes(StandardCharsets.UTF_8);
        ex.sendResponseHeaders(r.estado(), bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    static final String ORDEN_APROBADA = """
            {"id":"ORD01J","type":"online","external_reference":"RL-1","total_amount":"100.00","total_paid_amount":"100.00",
             "status":"processed","status_detail":"accredited","currency":"PEN",
             "transactions":{"payments":[{"id":"PAY01","amount":"100.00","status":"processed","status_detail":"accredited",
              "payment_method":{"id":"visa","type":"credit_card","installments":1}}]}}""";

    SolicitudOrden solicitudTarjeta() {
        return new SolicitudOrden("RL-1", new BigDecimal("100.00"), "RutaLibre", "test@testuser.com", "DNI", "12345678",
                null, "visa", "credit_card", "tok_123", 3, "on_fraud_risk");
    }

    @Test
    void creaLaOrderConCabecerasYCuerpoDeLaDocumentacion() throws Exception {
        respuestas.put("POST /v1/orders", new Respuesta(201, ORDEN_APROBADA, 0));
        OrdenMercadoPago orden = cliente.crearOrden(solicitudTarjeta(), "RL-1");

        assertTrue(orden.aprobada());
        assertEquals("ORD01J", orden.id());
        assertEquals("PAY01", orden.idPago());
        assertEquals(0, new BigDecimal("100.00").compareTo(orden.montoTotal()));

        Map<String, String> s = solicitudes.get(0);
        assertEquals("Bearer TEST-token-falso", s.get("auth"));
        assertEquals("RL-1", s.get("idem"));
        JsonNode cuerpo = json.readTree(s.get("cuerpo"));
        assertEquals("online", cuerpo.get("type").asText());
        assertEquals("automatic", cuerpo.get("processing_mode").asText());
        assertEquals("100.00", cuerpo.get("total_amount").asText());
        assertEquals("RL-1", cuerpo.get("external_reference").asText());
        assertEquals("test@testuser.com", cuerpo.get("payer").get("email").asText());
        assertEquals("DNI", cuerpo.get("payer").get("identification").get("type").asText());
        JsonNode pago = cuerpo.get("transactions").get("payments").get(0);
        assertEquals("100.00", pago.get("amount").asText());
        assertEquals("visa", pago.get("payment_method").get("id").asText());
        assertEquals("credit_card", pago.get("payment_method").get("type").asText());
        assertEquals("tok_123", pago.get("payment_method").get("token").asText());
        assertEquals(3, pago.get("payment_method").get("installments").asInt());
        JsonNode seguridad = cuerpo.get("config").get("online").get("transaction_security");
        assertEquals("on_fraud_risk", seguridad.get("validation").asText());
        assertEquals("required", seguridad.get("liability_shift").asText());
    }

    @Test
    void cuerpoDeYapeLlevaTelefonoYSin3ds() {
        SolicitudOrden yape = new SolicitudOrden("RL-2", new BigDecimal("50"), null, "a@b.com", null, null, "111111111",
                "yape", "debit_card", "tok_yape", 1, null);
        JsonNode cuerpo = cliente.construirCuerpoOrden(yape);
        assertEquals("51", cuerpo.get("payer").get("phone").get("area_code").asText());
        assertEquals("111111111", cuerpo.get("payer").get("phone").get("number").asText());
        assertEquals("50.00", cuerpo.get("total_amount").asText());
        assertFalse(cuerpo.has("config"));
        assertEquals("yape", cuerpo.get("transactions").get("payments").get(0).get("payment_method").get("id").asText());
    }

    @Test
    void desafio3dsYRechazo402SeInterpretan() {
        respuestas.put("POST /v1/orders", new Respuesta(201, """
                {"id":"ORD3","status":"action_required","status_detail":"pending_challenge","external_reference":"RL-1",
                 "total_amount":"100.00","transactions":{"payments":[{"id":"PAY3","status":"action_required",
                 "status_detail":"pending_challenge","payment_method":{"transaction_security":{"url":"https://3ds.example"}}}]}}""", 0));
        OrdenMercadoPago orden = cliente.crearOrden(solicitudTarjeta(), "RL-1");
        assertTrue(orden.requiereDesafio3ds());
        assertEquals("https://3ds.example", orden.urlDesafio3ds());

        respuestas.put("POST /v1/orders", new Respuesta(402, """
                {"id":"ORD4","status":"failed","status_detail":"failed","external_reference":"RL-1","total_amount":"100.00",
                 "transactions":{"payments":[{"id":"PAY4","status":"failed","status_detail":"cc_rejected_insufficient_amount"}]}}""", 0));
        ErrorMercadoPagoException e = assertThrows(ErrorMercadoPagoException.class, () -> cliente.crearOrden(solicitudTarjeta(), "RL-1"));
        assertEquals(ErrorMercadoPagoException.Tipo.PAGO_RECHAZADO, e.getTipo());
        assertEquals("cc_rejected_insufficient_amount", e.getOrdenAdjunta().motivo());
        assertTrue(e.getOrdenAdjunta().fallidaOCerrada());
    }

    @Test
    void erroresDelProveedorSeClasifican() {
        respuestas.put("POST /v1/orders", new Respuesta(400, "{\"errors\":[{\"code\":\"invalid_email_for_sandbox\",\"message\":\"x\"}]}", 0));
        ErrorMercadoPagoException e = assertThrows(ErrorMercadoPagoException.class, () -> cliente.crearOrden(solicitudTarjeta(), "k"));
        assertEquals(ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, e.getTipo());
        assertEquals("invalid_email_for_sandbox", e.getCodigo());

        for (int estado : new int[] {500, 503, 423, 429}) {
            respuestas.put("POST /v1/orders", new Respuesta(estado, "{}", 0));
            assertEquals(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO,
                    assertThrows(ErrorMercadoPagoException.class, () -> cliente.crearOrden(solicitudTarjeta(), "k")).getTipo());
        }
        respuestas.put("POST /v1/orders", new Respuesta(200, "no es json", 0));
        assertEquals(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO,
                assertThrows(ErrorMercadoPagoException.class, () -> cliente.crearOrden(solicitudTarjeta(), "k")).getTipo());

        assertEquals(ErrorMercadoPagoException.Tipo.NO_ENCONTRADO,
                assertThrows(ErrorMercadoPagoException.class, () -> cliente.consultarOrden("NOEXISTE")).getTipo());
    }

    @Test
    void timeoutEsResultadoDesconocido() {
        respuestas.put("POST /v1/orders", new Respuesta(201, ORDEN_APROBADA, 3500));
        ErrorMercadoPagoException e = assertThrows(ErrorMercadoPagoException.class, () -> cliente.crearOrden(solicitudTarjeta(), "k"));
        assertEquals(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, e.getTipo());
    }

    @Test
    void consultaBusquedaCancelacionYReembolso() {
        respuestas.put("GET /v1/orders/ORD01J", new Respuesta(200, ORDEN_APROBADA, 0));
        assertTrue(cliente.consultarOrden("ORD01J").aprobada());
        assertEquals("null", solicitudes.get(0).get("idem"), "GET sin clave de idempotencia");

        respuestas.put("GET /v1/orders", new Respuesta(200, "{\"data\":[" + ORDEN_APROBADA + "],\"paging\":{}}", 0));
        assertEquals("ORD01J", cliente.buscarPorReferencia("RL-1", OffsetDateTime.now().minusHours(1), OffsetDateTime.now()).orElseThrow().id());
        assertTrue(cliente.buscarPorReferencia("RL-OTRA", OffsetDateTime.now().minusHours(1), OffsetDateTime.now()).isEmpty());
        assertTrue(solicitudes.get(1).get("ruta").contains("external_reference=RL-1"));

        respuestas.put("POST /v1/orders/ORD01J/refund", new Respuesta(201, ORDEN_APROBADA.replace("\"processed\",\"status_detail\":\"accredited\",\"currency\"", "\"refunded\",\"status_detail\":\"refunded\",\"currency\""), 0));
        cliente.reembolsarOrden("ORD01J", "refund-RL-1");
        assertEquals("refund-RL-1", solicitudes.get(solicitudes.size() - 1).get("idem"));
    }

    @Test
    void sinAccessTokenNoLlamaALaApi() {
        ClienteMercadoPagoHttp sinToken = new ClienteMercadoPagoHttp("", "http://127.0.0.1:1", 2, json);
        assertFalse(sinToken.configurado());
        assertEquals(ErrorMercadoPagoException.Tipo.NO_CONFIGURADO,
                assertThrows(ErrorMercadoPagoException.class, () -> sinToken.consultarOrden("x")).getTipo());
        assertTrue(solicitudes.isEmpty());
        assertNull(new SolicitudOrden("r", BigDecimal.ONE, null, "e", null, null, null, "visa", "credit_card",
                "tok_secreto", 1, null).toString().contains("tok_secreto") ? "filtra" : null, "toString no expone el token");
    }
}
