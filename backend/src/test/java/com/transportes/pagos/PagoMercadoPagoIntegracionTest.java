package com.transportes.pagos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.transportes.pagos.mercadopago.ClienteMercadoPago;
import com.transportes.pagos.mercadopago.ErrorMercadoPagoException;
import com.transportes.pagos.mercadopago.OrdenMercadoPago;
import com.transportes.pagos.mercadopago.SolicitudOrden;
import com.transportes.pagos.mercadopago.ValidadorFirmaWebhook;
import com.transportes.pagos.servicios.PagoServicio;
import com.transportes.viajes.servicios.ClienteDni;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Flujo completo de pago contra H2 con la API de Mercado Pago simulada por un mock (no hay llamadas reales).
 * Comprueba que solo una order verificada como processed/accredited genera venta, pago y pasajes.
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:pagos;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "mercadopago.segundos-entre-consultas=0",
    "mercadopago.segundos-resultado-desconocido=0"
})
class PagoMercadoPagoIntegracionTest {

    static final long VIAJE = 1L;
    static final String CLAVE = "ClavePagos2026!";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired ValidadorFirmaWebhook validadorFirma;
    @Autowired PagoServicio pagoServicio;
    @MockitoBean ClienteMercadoPago mp;
    @MockitoBean ClienteDni clienteDni;
    final HttpClient http = HttpClient.newHttpClient();
    String jwt;

    @BeforeEach
    void preparar() throws Exception {
        for (String tabla : List.of("pasaje", "pago", "operacion_pago", "venta", "viaje_asiento", "pasajero",
                "asiento", "viaje", "bus", "metodo_pago")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo, activo) VALUES('Mercado Pago - Tarjeta', true)");
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo, activo) VALUES('Mercado Pago - Yape', true)");
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,NULL,true)");
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(1,NULL,1,DATE '2030-01-01',CAST('08:00:00' AS TIME),'PROGRAMADO')");
        for (int i = 1; i <= 4; i++) {
            jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", i, i + "A");
            jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento) "
                    + "VALUES(?,1,50,'DISPONIBLE',?)", i, i);
        }
        reset(mp);
        when(mp.configurado()).thenReturn(true);
        when(clienteDni.consultar(anyString())).thenReturn(Optional.empty());
        jwt = jwtUsuario();
    }

    // ------------------------------------------------------------------ utilidades

    HttpResponse<String> enviar(String metodo, String ruta, Object cuerpo, String token, Map<String, String> cabeceras)
            throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        cabeceras.forEach(b::header);
        b.method(metodo, cuerpo == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(cuerpo instanceof String s ? s : json.writeValueAsString(cuerpo)));
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> enviar(String metodo, String ruta, Object cuerpo, String token) throws Exception {
        return enviar(metodo, ruta, cuerpo, token, Map.of());
    }

    String jwtUsuario() throws Exception {
        String correo = "pagos-" + UUID.randomUUID() + "@example.com";
        var registro = enviar("POST", "/api/usuarios/registro",
                Map.of("nombres", "Karina", "apellidos", "Prueba", "correo", correo, "contrasena", CLAVE), null);
        assertEquals(201, registro.statusCode(), registro.body());
        var login = enviar("POST", "/api/auth/login", Map.of("correo", correo, "contrasena", CLAVE), null);
        return json.readTree(login.body()).get("token").asText();
    }

    /** Sesión con asientos bloqueados y pasajeros validados ("Continuar al pago"). */
    String reservaLista(int... asientos) throws Exception {
        var sesion = enviar("POST", "/api/viajes/" + VIAJE + "/sesiones", null, null);
        String token = json.readTree(sesion.body()).get("tokenSesion").asText();
        List<Map<String, Object>> pasajeros = new java.util.ArrayList<>();
        int dni = 40000000;
        for (int asiento : asientos) {
            var r = enviar("POST", "/api/viajes/" + VIAJE + "/asientos/" + asiento + "/bloquear", Map.of("tokenSesion", token), null);
            assertEquals(200, r.statusCode(), r.body());
            pasajeros.add(Map.of("idAsiento", asiento, "tipoDocumento", "DNI", "numeroDocumento", String.valueOf(dni + asiento),
                    "nombres", "Pasajero", "apellidos", "Rojas " + (char) ('A' + asiento) + "uispe", "fechaNacimiento", "1995-05-05",
                    "nroTelefono", "9" + (11111110 + asiento)));
        }
        var cont = enviar("POST", "/api/viajes/" + VIAJE + "/pasajeros", Map.of("tokenSesion", token, "pasajeros", pasajeros), null);
        assertTrue(json.readTree(cont.body()).get("valido").asBoolean(), cont.body());
        return token;
    }

    Map<String, Object> solicitudTarjeta(String tokenSesion, String clave) {
        Map<String, Object> m = new HashMap<>();
        m.put("idViaje", VIAJE);
        m.put("tokenSesion", tokenSesion);
        m.put("claveIdempotencia", clave);
        m.put("medioPago", "TARJETA");
        m.put("token", "card-token-de-prueba");
        m.put("metodoPagoId", "visa");
        m.put("tipoPago", "credit_card");
        m.put("cuotas", 1);
        m.put("emailPagador", "comprador@example.com");
        m.put("tipoDocumento", "DNI");
        m.put("numeroDocumento", "12345678");
        return m;
    }

    JsonNode pagar(Map<String, Object> solicitud) throws Exception {
        var r = enviar("POST", "/api/pagos", solicitud, jwt);
        assertEquals(200, r.statusCode(), r.body());
        return json.readTree(r.body());
    }

    JsonNode consultar(String referencia) throws Exception {
        var r = enviar("GET", "/api/pagos/" + referencia, null, jwt);
        assertEquals(200, r.statusCode(), r.body());
        return json.readTree(r.body());
    }

    static OrdenMercadoPago orden(String id, String estado, String detalle, String ref, String total) {
        return new OrdenMercadoPago(id, estado, detalle, ref, new BigDecimal(total),
                "processed".equals(estado) ? new BigDecimal(total) : null, "PEN", "PAY-" + id, estado, detalle, null);
    }

    /** El mock responde a la creación con el estado indicado, usando la referencia que envió el backend. */
    void alCrear(String estado, String detalle) {
        doAnswer(inv -> {
            SolicitudOrden s = inv.getArgument(0);
            return orden("ORD-" + s.referenciaExterna().substring(3, 11).toUpperCase(), estado, detalle,
                    s.referenciaExterna(), s.monto().toPlainString());
        }).when(mp).crearOrden(any(), anyString());
    }

    int cuenta(String sql, Object... args) {
        return jdbc.queryForObject(sql, Integer.class, args);
    }

    void assertSinCompra() {
        assertEquals(0, cuenta("SELECT COUNT(*) FROM venta"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM pago"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM pasaje"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM pasajero"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='OCUPADO'"));
    }

    HttpResponse<String> webhook(String idOrden, String firmaManual) throws Exception {
        String requestId = UUID.randomUUID().toString();
        String ts = String.valueOf(System.currentTimeMillis() / 1000);
        String firma = firmaManual != null ? firmaManual
                : "ts=" + ts + ",v1=" + validadorFirma.firmar("id:" + idOrden + ";request-id:" + requestId + ";ts:" + ts + ";");
        String cuerpo = "{\"action\":\"order.processed\",\"type\":\"order\",\"data\":{\"id\":\"" + idOrden
                + "\",\"status\":\"processed\",\"status_detail\":\"accredited\"}}";
        return enviar("POST", "/api/pagos/webhook?data.id=" + idOrden + "&type=order", cuerpo, null,
                Map.of("x-signature", firma, "x-request-id", requestId));
    }

    // ------------------------------------------------------------------ aprobado

    @Test
    void pagoAprobadoRegistraVentaPagoYPasajesConElImporteDelServidor() throws Exception {
        String sesion = reservaLista(1, 2);
        alCrear("processed", "accredited");
        Map<String, Object> solicitud = solicitudTarjeta(sesion, UUID.randomUUID().toString());
        solicitud.put("monto", 1);               // el navegador intenta pagar menos: se ignora
        solicitud.put("transaction_amount", 1);

        JsonNode r = pagar(solicitud);
        assertEquals("APROBADO", r.get("estado").asText(), r.toString());
        assertTrue(r.get("finalizado").asBoolean());
        assertEquals(0, new BigDecimal("100.00").compareTo(r.get("montoTotal").decimalValue()));
        assertEquals(2, r.get("compra").get("pasajes").size());
        assertTrue(r.get("compra").get("pasajes").get(0).get("documento").asText().contains("****"));

        ArgumentCaptor<SolicitudOrden> enviada = ArgumentCaptor.forClass(SolicitudOrden.class);
        ArgumentCaptor<String> clave = ArgumentCaptor.forClass(String.class);
        verify(mp, times(1)).crearOrden(enviada.capture(), clave.capture());
        assertEquals(0, new BigDecimal("100.00").compareTo(enviada.getValue().monto()));
        assertEquals(enviada.getValue().referenciaExterna(), clave.getValue(), "X-Idempotency-Key = referencia");
        assertEquals("on_fraud_risk", enviada.getValue().validacion3ds());

        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta WHERE estado_venta='PAGADA' AND monto_total=100.00"));
        assertEquals(1, cuenta("SELECT COUNT(*) FROM pago p JOIN metodo_pago m ON m.id_metodo_pago=p.id_metodo_pago "
                + "WHERE p.estado_pago='APROBADO' AND p.monto=100.00 AND m.nombre_metodo='Mercado Pago - Tarjeta'"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM pasaje pa JOIN venta v ON v.id_venta=pa.id_venta "
                + "JOIN viaje_asiento va ON va.id_viaje_asiento=pa.id_viaje_asiento "
                + "WHERE va.estado_viaje_asiento='OCUPADO' AND va.id_pasajero=pa.id_pasajero"));
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta v JOIN usuario u ON u.id_usuario=v.id_usuario"));
        assertEquals(1, cuenta("SELECT COUNT(*) FROM operacion_pago WHERE estado='APROBADO' AND id_venta IS NOT NULL "
                + "AND datos_pasajeros IS NULL AND mp_order_id IS NOT NULL"));
    }

    // ------------------------------------------------------------------ rechazo y reintento

    @Test
    void pagoRechazadoNoRegistraNadaYPermiteReintentar() throws Exception {
        String sesion = reservaLista(1);
        alCrear("failed", "cc_rejected_insufficient_amount");
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals("RECHAZADO", r.get("estado").asText());
        assertTrue(r.get("reintentable").asBoolean());
        assertTrue(r.get("mensaje").asText().contains("fondos"));
        assertNotNull(r.get("sesion").get("tokenSesion").asText(), "se reemite la sesión para reintentar");
        assertSinCompra();
        assertEquals(1, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='BLOQUEADO_TEMPORAL'"));

        // Reintento con un token nuevo de tarjeta y una clave nueva: ahora se aprueba.
        String sesionRenovada = r.get("sesion").get("tokenSesion").asText();
        alCrear("processed", "accredited");
        JsonNode r2 = pagar(solicitudTarjeta(sesionRenovada, UUID.randomUUID().toString()));
        assertEquals("APROBADO", r2.get("estado").asText());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM operacion_pago"));
    }

    @Test
    void rechazo402SinOrdenYErrorDeDatosNoGeneranCompra() throws Exception {
        String sesion = reservaLista(1);
        doThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.PAGO_RECHAZADO, 402, "failed", "x", null)).when(mp).crearOrden(any(), anyString());
        assertEquals("RECHAZADO", pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString())).get("estado").asText());

        doThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, 400, "invalid_email_for_sandbox", "x", null)).when(mp).crearOrden(any(), anyString());
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals("ERROR", r.get("estado").asText());
        assertTrue(r.get("reintentable").asBoolean());
        assertSinCompra();
    }

    // ------------------------------------------------------------------ pendiente, 3DS, consulta

    @Test
    void pagoPendienteNoConfirmaHastaQueLaConsultaLoVerifica() throws Exception {
        String sesion = reservaLista(1, 2);
        alCrear("processing", "in_process");
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals("EN_PROCESO", r.get("estado").asText());
        assertFalse(r.get("finalizado").asBoolean());
        assertSinCompra();

        String referencia = r.get("referencia").asText();
        String idOrden = r.get("ordenId").asText();
        when(mp.consultarOrden(idOrden)).thenReturn(orden(idOrden, "processing", "in_process", referencia, "100.00"));
        assertEquals("EN_PROCESO", consultar(referencia).get("estado").asText());
        assertSinCompra();

        when(mp.consultarOrden(idOrden)).thenReturn(orden(idOrden, "processed", "accredited", referencia, "100.00"));
        JsonNode aprobado = consultar(referencia);
        assertEquals("APROBADO", aprobado.get("estado").asText());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM pasaje"));
    }

    @Test
    void desafio3dsDevuelveLaUrlYNoConfirma() throws Exception {
        String sesion = reservaLista(1);
        doAnswer(inv -> {
            SolicitudOrden s = inv.getArgument(0);
            return new OrdenMercadoPago("ORD3DS", "action_required", "pending_challenge", s.referenciaExterna(),
                    s.monto(), null, "PEN", "PAY1", "action_required", "pending_challenge", "https://desafio.example/3ds");
        }).when(mp).crearOrden(any(), anyString());
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals("ACCION_REQUERIDA", r.get("estado").asText());
        assertEquals("https://desafio.example/3ds", r.get("urlDesafio3ds").asText());
        assertSinCompra();
    }

    @Test
    void consultaRequiereSesionYSoloElDuenoVeLaOperacion() throws Exception {
        String sesion = reservaLista(1);
        alCrear("processing", "in_process");
        String referencia = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString())).get("referencia").asText();
        assertEquals(401, enviar("GET", "/api/pagos/" + referencia, null, null).statusCode());
        assertEquals(404, enviar("GET", "/api/pagos/" + referencia, null, jwtUsuario()).statusCode());
        assertEquals(401, enviar("POST", "/api/pagos", solicitudTarjeta(sesion, UUID.randomUUID().toString()), null).statusCode());
    }

    // ------------------------------------------------------------------ idempotencia y duplicados

    @Test
    void mismaClaveDeIdempotenciaNoCreaOtraOrder() throws Exception {
        String sesion = reservaLista(1);
        alCrear("processed", "accredited");
        String clave = UUID.randomUUID().toString();
        JsonNode r1 = pagar(solicitudTarjeta(sesion, clave));
        JsonNode r2 = pagar(solicitudTarjeta(sesion, clave));
        assertEquals(r1.get("referencia").asText(), r2.get("referencia").asText());
        verify(mp, times(1)).crearOrden(any(), anyString());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
    }

    @Test
    void unaSolaOperacionActivaPorSesionAunqueCambieLaClave() throws Exception {
        String sesion = reservaLista(1);
        alCrear("processing", "in_process");
        JsonNode r1 = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        JsonNode r2 = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals(r1.get("referencia").asText(), r2.get("referencia").asText());
        verify(mp, times(1)).crearOrden(any(), anyString());
    }

    @Test
    void solicitudesConcurrentesCreanUnaSolaOrder() throws Exception {
        String sesion = reservaLista(1, 2);
        alCrear("processed", "accredited");
        String clave = UUID.randomUUID().toString();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Integer>> tareas = java.util.Collections.nCopies(4,
                    () -> enviar("POST", "/api/pagos", solicitudTarjeta(sesion, clave), jwt).statusCode());
            for (Future<Integer> f : pool.invokeAll(tareas)) {
                int estado = f.get();
                assertTrue(estado == 200 || estado == 409, "estado " + estado);
            }
        } finally {
            pool.shutdownNow();
        }
        verify(mp, times(1)).crearOrden(any(), anyString());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM pasaje"));
    }

    // ------------------------------------------------------------------ webhooks

    @Test
    void webhookValidoConsultaLaOrderYLosRepetidosNoDuplican() throws Exception {
        String sesion = reservaLista(1, 2);
        alCrear("processing", "in_process");
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        String referencia = r.get("referencia").asText();
        String idOrden = r.get("ordenId").asText();
        when(mp.consultarOrden(idOrden)).thenReturn(orden(idOrden, "processed", "accredited", referencia, "100.00"));

        for (int i = 0; i < 3; i++) {
            assertEquals(200, webhook(idOrden, null).statusCode());
        }
        verify(mp, times(3)).consultarOrden(idOrden);
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM pasaje"));

        // Evento tardío y fuera de orden ("processing"): una compra aprobada no retrocede.
        when(mp.consultarOrden(idOrden)).thenReturn(orden(idOrden, "processing", "in_process", referencia, "100.00"));
        assertEquals(200, webhook(idOrden, null).statusCode());
        assertEquals("APROBADO", consultar(referencia).get("estado").asText());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
    }

    @Test
    void webhookConFirmaInvalidaSeRechazaSinConsultarNiRegistrar() throws Exception {
        String sesion = reservaLista(1);
        alCrear("processing", "in_process");
        String idOrden = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString())).get("ordenId").asText();

        assertEquals(401, webhook(idOrden, "ts=1700000000,v1=" + "0".repeat(64)).statusCode());
        assertEquals(401, enviar("POST", "/api/pagos/webhook?data.id=" + idOrden + "&type=order",
                "{\"type\":\"order\",\"data\":{\"id\":\"" + idOrden + "\"}}", null).statusCode());
        verify(mp, never()).consultarOrden(anyString());
        assertSinCompra();
    }

    @Test
    void webhookNoConfiaEnElCuerpoSinoEnLaConsulta() throws Exception {
        String sesion = reservaLista(1);
        alCrear("processing", "in_process");
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        String idOrden = r.get("ordenId").asText();
        // El cuerpo del webhook dice "processed/accredited", pero la API dice "failed".
        when(mp.consultarOrden(idOrden)).thenReturn(orden(idOrden, "failed", "failed", r.get("referencia").asText(), "50.00"));
        assertEquals(200, webhook(idOrden, null).statusCode());
        assertEquals("RECHAZADO", consultar(r.get("referencia").asText()).get("estado").asText());
        assertSinCompra();
    }

    @Test
    void webhookResponde503SiMercadoPagoNoRespondeParaQueReintente() throws Exception {
        when(mp.consultarOrden("ORDX")).thenThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, "timeout"));
        assertEquals(503, webhook("ORDX", null).statusCode());
        when(mp.consultarOrden("ORDY")).thenThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.NO_ENCONTRADO, 404, null, "x", null));
        assertEquals(200, webhook("ORDY", null).statusCode());
    }

    @Test
    void webhookConIdQueNoEsDeOrderSeIgnoraSinConsultarLaApi() throws Exception {
        // El botón "Simular" del panel de Mercado Pago envía 123456 por defecto: no es una order.
        assertEquals(200, webhook("123456", null).statusCode());
        assertEquals(200, webhook("PAY01M28P44GDSD4JYTSK5SYZT6BH", null).statusCode());
        verify(mp, never()).consultarOrden(anyString());
        assertSinCompra();
    }

    @Test
    void webhookDescartaLaConsultaRechazadaParaSiempreYReintentaSiFallanLasCredenciales() throws Exception {
        // 400 invalid_path_param / 422: repetir la notificación no cambia nada -> 200 (sin reintentos inútiles).
        when(mp.consultarOrden("ORDZ")).thenThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, 400, "invalid_path_param", "x", null));
        assertEquals(200, webhook("ORDZ", null).statusCode());
        // 401 de Mercado Pago = nuestro Access Token mal configurado: al corregirlo, el reintento sí sirve -> 503.
        when(mp.consultarOrden("ORDW")).thenThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, 401, "invalid_credentials", "x", null));
        assertEquals(503, webhook("ORDW", null).statusCode());
        assertSinCompra();
    }

    @Test
    void webhookConsultaLaOrderConElIdNormalizadoEnMayusculas() throws Exception {
        when(mp.consultarOrden("ORDQ")).thenThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.NO_ENCONTRADO, 404, null, "x", null));
        assertEquals(200, webhook("ordq", null).statusCode());
        verify(mp).consultarOrden("ORDQ");
    }

    // ------------------------------------------------------------------ autenticación de POST /api/pagos

    @Test
    void pagoExigeJwtYNoConfundeElTokenDeSesionDeReservaConLaAutenticacion() throws Exception {
        String sesion = reservaLista(1);
        alCrear("processed", "accredited");

        var sinJwt = enviar("POST", "/api/pagos", solicitudTarjeta(sesion, UUID.randomUUID().toString()), null);
        assertEquals(401, sinJwt.statusCode());
        assertTrue(sinJwt.body().contains("No autenticado"), sinJwt.body());

        var jwtFalso = enviar("POST", "/api/pagos", solicitudTarjeta(sesion, UUID.randomUUID().toString()), "no.es.un-jwt");
        assertEquals(401, jwtFalso.statusCode());
        assertTrue(jwtFalso.body().contains("No autenticado"), jwtFalso.body());

        // Con JWT válido, un token de sesión de RESERVA inválido también es 401, pero con otro mensaje.
        var sesionFalsa = enviar("POST", "/api/pagos", solicitudTarjeta("no-es-un-token", UUID.randomUUID().toString()), jwt);
        assertEquals(401, sesionFalsa.statusCode());
        assertTrue(sesionFalsa.body().contains("Token de sesión inválido"), sesionFalsa.body());

        verify(mp, never()).crearOrden(any(), anyString());
        assertSinCompra();

        // Con JWT y sesión de reserva válidos el pago procede.
        assertEquals("APROBADO", pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString())).get("estado").asText());
    }

    // ------------------------------------------------------------------ errores del proveedor

    @Test
    void timeoutAlCrearReintentaConLaMismaClaveYLuegoSeConcilia() throws Exception {
        String sesion = reservaLista(1);
        doThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, "timeout")).when(mp).crearOrden(any(), anyString());
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals("CREANDO", r.get("estado").asText());
        assertFalse(r.get("finalizado").asBoolean());
        String referencia = r.get("referencia").asText();
        verify(mp, times(2)).crearOrden(any(), eq(referencia));
        assertSinCompra();

        when(mp.buscarPorReferencia(eq(referencia), any(), any()))
                .thenReturn(Optional.of(orden("ORD-TARDE", "processed", "accredited", referencia, "50.00")));
        JsonNode conciliado = consultar(referencia);
        assertEquals("APROBADO", conciliado.get("estado").asText());
        assertEquals("ORD-TARDE", conciliado.get("ordenId").asText());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
    }

    @Test
    void timeoutSinOrderEncontradaSeCierraSinCobro() throws Exception {
        String sesion = reservaLista(1);
        doThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, "timeout")).when(mp).crearOrden(any(), anyString());
        String referencia = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString())).get("referencia").asText();
        when(mp.buscarPorReferencia(eq(referencia), any(), any())).thenReturn(Optional.empty());
        JsonNode r = consultar(referencia);
        assertEquals("ERROR", r.get("estado").asText());
        assertTrue(r.get("reintentable").asBoolean());
        assertSinCompra();
    }

    @Test
    void mercadoPagoSinConfigurarDevuelve503YNoCreaNada() throws Exception {
        String sesion = reservaLista(1);
        when(mp.configurado()).thenReturn(false);
        var r = enviar("POST", "/api/pagos", solicitudTarjeta(sesion, UUID.randomUUID().toString()), jwt);
        assertEquals(503, r.statusCode());
        assertEquals(0, cuenta("SELECT COUNT(*) FROM operacion_pago"));
    }

    // ------------------------------------------------------------------ persistencia y asientos

    @Test
    void siLosAsientosYaNoEstanSeRevierteTodoYSeReembolsa() throws Exception {
        String sesion = reservaLista(1, 2);
        alCrear("processing", "in_process");
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        String referencia = r.get("referencia").asText();
        String idOrden = r.get("ordenId").asText();

        // El asiento 2 se liberó y otro cliente lo tomó mientras el pago estaba pendiente.
        jdbc.update("UPDATE viaje_asiento SET token_bloqueo='otra-sesion' WHERE id_asiento=2");
        when(mp.consultarOrden(idOrden)).thenReturn(orden(idOrden, "processed", "accredited", referencia, "100.00"));
        when(mp.reembolsarOrden(eq(idOrden), anyString())).thenReturn(orden(idOrden, "refunded", "refunded", referencia, "100.00"));

        JsonNode estado = consultar(referencia);
        assertEquals("REEMBOLSADO", estado.get("estado").asText());
        verify(mp, times(1)).reembolsarOrden(eq(idOrden), eq("refund-" + referencia));
        // Todo o nada: ni el asiento 1 quedó ocupado ni se creó ningún pasajero, venta o pasaje.
        assertSinCompra();
        assertEquals(1, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE id_asiento=1 AND estado_viaje_asiento='BLOQUEADO_TEMPORAL'"));
    }

    @Test
    void importeDistintoEnLaOrderNoRegistraLaCompra() throws Exception {
        String sesion = reservaLista(1);
        doAnswer(inv -> {
            SolicitudOrden s = inv.getArgument(0);
            return orden("ORD-MONTO", "processed", "accredited", s.referenciaExterna(), "1.00");
        }).when(mp).crearOrden(any(), anyString());
        when(mp.reembolsarOrden(anyString(), anyString())).thenThrow(new ErrorMercadoPagoException(
                ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, "timeout"));
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals("APROBADO_SIN_ASIENTOS", r.get("estado").asText(), "reembolso pendiente: lo reintenta el job");
        assertSinCompra();
    }

    @Test
    void reservaVencidaOSinPasajerosNoIniciaElPago() throws Exception {
        String sesion = reservaLista(1);
        jdbc.update("UPDATE viaje_asiento SET fecha_expiracion_bloqueo = DATEADD('MINUTE', -1, CURRENT_TIMESTAMP)");
        assertEquals(409, enviar("POST", "/api/pagos", solicitudTarjeta(sesion, UUID.randomUUID().toString()), jwt).statusCode());

        var s2 = enviar("POST", "/api/viajes/" + VIAJE + "/sesiones", null, null);
        String token = json.readTree(s2.body()).get("tokenSesion").asText();
        enviar("POST", "/api/viajes/" + VIAJE + "/asientos/3/bloquear", Map.of("tokenSesion", token), null);
        assertEquals(409, enviar("POST", "/api/pagos", solicitudTarjeta(token, UUID.randomUUID().toString()), jwt).statusCode());
        verify(mp, never()).crearOrden(any(), anyString());
        assertEquals(0, cuenta("SELECT COUNT(*) FROM operacion_pago"));
    }

    @Test
    void unAsientoNoSePuedeBloquearPorDosCompradores() throws Exception {
        reservaLista(1);
        var otra = enviar("POST", "/api/viajes/" + VIAJE + "/sesiones", null, null);
        String token = json.readTree(otra.body()).get("tokenSesion").asText();
        assertEquals(409, enviar("POST", "/api/viajes/" + VIAJE + "/asientos/1/bloquear", Map.of("tokenSesion", token), null).statusCode());
    }

    @Test
    void validacionesDeEntrada() throws Exception {
        String sesion = reservaLista(1);
        Map<String, Object> sinToken = solicitudTarjeta(sesion, UUID.randomUUID().toString());
        sinToken.remove("token");
        assertEquals(400, enviar("POST", "/api/pagos", sinToken, jwt).statusCode());

        Map<String, Object> medio = solicitudTarjeta(sesion, UUID.randomUUID().toString());
        medio.put("medioPago", "EFECTIVO");
        assertEquals(400, enviar("POST", "/api/pagos", medio, jwt).statusCode());

        Map<String, Object> clave = solicitudTarjeta(sesion, "corta");
        assertEquals(400, enviar("POST", "/api/pagos", clave, jwt).statusCode());

        Map<String, Object> yapeSinCelular = solicitudTarjeta(sesion, UUID.randomUUID().toString());
        yapeSinCelular.put("medioPago", "YAPE");
        assertEquals(400, enviar("POST", "/api/pagos", yapeSinCelular, jwt).statusCode());

        assertEquals(400, enviar("POST", "/api/pagos", "{no-json", jwt).statusCode());
        verify(mp, never()).crearOrden(any(), anyString());
    }

    @Test
    void yapeUsaElMetodoYapeYElTelefonoDelPagador() throws Exception {
        String sesion = reservaLista(1);
        alCrear("processed", "accredited");
        Map<String, Object> yape = solicitudTarjeta(sesion, UUID.randomUUID().toString());
        yape.put("medioPago", "YAPE");
        yape.put("celular", "111111111");
        yape.remove("metodoPagoId");
        assertEquals("APROBADO", pagar(yape).get("estado").asText());
        ArgumentCaptor<SolicitudOrden> enviada = ArgumentCaptor.forClass(SolicitudOrden.class);
        verify(mp).crearOrden(enviada.capture(), anyString());
        assertEquals("yape", enviada.getValue().metodoPagoId());
        assertEquals("debit_card", enviada.getValue().metodoPagoTipo());
        assertEquals("111111111", enviada.getValue().celularPagador());
        assertNull(enviada.getValue().validacion3ds());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM pago p JOIN metodo_pago m ON m.id_metodo_pago=p.id_metodo_pago "
                + "WHERE m.nombre_metodo='Mercado Pago - Yape'"));
    }

    @Test
    void operacionVencidaSeCancelaYQuedaExpirada() throws Exception {
        String sesion = reservaLista(1);
        alCrear("action_required", "waiting_payment");
        JsonNode r = pagar(solicitudTarjeta(sesion, UUID.randomUUID().toString()));
        assertEquals("EN_PROCESO", r.get("estado").asText());
        String referencia = r.get("referencia").asText();
        String idOrden = r.get("ordenId").asText();
        jdbc.update("UPDATE operacion_pago SET fecha_expiracion = DATEADD('MINUTE', -1, CURRENT_TIMESTAMP)");
        when(mp.consultarOrden(idOrden)).thenReturn(orden(idOrden, "action_required", "waiting_payment", referencia, "50.00"));
        when(mp.cancelarOrden(eq(idOrden), anyString())).thenReturn(orden(idOrden, "canceled", "canceled", referencia, "50.00"));

        JsonNode expirado = consultar(referencia);
        assertEquals("EXPIRADO", expirado.get("estado").asText());
        verify(mp).cancelarOrden(eq(idOrden), eq("cancel-" + referencia));
        assertSinCompra();
    }
}
