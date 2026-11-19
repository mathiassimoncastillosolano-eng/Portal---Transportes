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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.transportes.RelojPruebaConfiguracion;
import com.transportes.RelojPruebaConfiguracion.RelojPrueba;
import com.transportes.pagos.culqi.CargoCulqi;
import com.transportes.pagos.culqi.ClienteCulqi;
import com.transportes.pagos.culqi.ErrorCulqiException;
import com.transportes.pagos.culqi.SolicitudCargo;
import com.transportes.viajes.servicios.ClienteDni;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:pagos;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "culqi.segundos-entre-consultas=0",
    "culqi.segundos-resultado-desconocido=0"
})
class PagoCulqiIntegracionTest {

    static final long VIAJE = 1L;
    static final String CLAVE = "ClavePagos2026!";
    static final String TOKEN_TARJETA = "tkn_test_AbCdEfGh12345678";
    static final String TOKEN_YAPE = "ype_test_AbCdEfGh12345678";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoBean ClienteCulqi culqi;
    @MockitoBean ClienteDni clienteDni;
    @Autowired RelojPrueba reloj;
    final HttpClient http = HttpClient.newHttpClient();
    String jwt;

    @BeforeEach
    void preparar() throws Exception {
        reloj.liberar();
        for (String tabla : List.of("pasaje", "pago", "operacion_pago", "venta", "viaje_asiento", "pasajero",
                "asiento", "viaje", "bus", "metodo_pago")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo, activo) VALUES('Culqi - Tarjeta', true)");
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo, activo) VALUES('Culqi - Yape', true)");
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,NULL,true)");
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(1,NULL,1,DATE '2030-01-01',CAST('08:00:00' AS TIME),'PROGRAMADO')");
        for (int i = 1; i <= 4; i++) {
            jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", i, i + "A");
            jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento) "
                    + "VALUES(?,1,50,'DISPONIBLE',?)", i, i);
        }
        reset(culqi);
        when(culqi.configurado()).thenReturn(true);
        when(clienteDni.consultar(anyString())).thenReturn(Optional.empty());
        jwt = jwtUsuario();
    }

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

    Map<String, Object> solicitud(String tokenSesion, String clave) {
        Map<String, Object> m = new HashMap<>();
        m.put("idViaje", VIAJE);
        m.put("tokenSesion", tokenSesion);
        m.put("claveIdempotencia", clave);
        m.put("medioPago", "TARJETA");
        m.put("token", TOKEN_TARJETA);
        m.put("emailPagador", "comprador@example.com");
        m.put("aceptaTerminos", true);
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

    static CargoCulqi cargo(String id, String resultado, String codigo, String referencia, String total) {
        return new CargoCulqi(id, resultado, codigo, null, referencia, new BigDecimal(total), BigDecimal.ZERO, "PEN",
                true, false);
    }

    void alCobrar(String resultado, String codigo) {
        doAnswer(inv -> {
            SolicitudCargo s = inv.getArgument(0);
            return cargo("chr_test_" + Math.abs(s.referenciaExterna().hashCode()), resultado, codigo,
                    s.referenciaExterna(), s.monto().toPlainString());
        }).when(culqi).crearCargo(any());
    }

    int cuenta(String sql, Object... args) {
        return jdbc.queryForObject(sql, Integer.class, args);
    }

    void assertSinCompra() {
        assertEquals(0, cuenta("SELECT COUNT(*) FROM venta"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM pago"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM pasaje"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='OCUPADO'"));
    }

    @Test
    void configuracionPublicaEntregaSoloLaLlavePublicaYElEntorno() throws Exception {
        var r = enviar("GET", "/api/pagos/configuracion", null, null);
        assertEquals(200, r.statusCode(), r.body());
        JsonNode c = json.readTree(r.body());
        assertTrue(c.get("disponible").asBoolean());
        assertEquals("SANDBOX", c.get("entorno").asText());
        assertEquals("pk_test_LlavePublicaFalsa01", c.get("publicKey").asText());
        assertFalse(r.body().contains("sk_test_"), "la llave secreta nunca sale del backend");
    }

    @Test
    void pagoAprobadoRegistraVentaPagoYPasajesConElImporteDelServidor() throws Exception {
        String sesion = reservaLista(1, 2);
        alCobrar("venta_exitosa", "AUT0000");
        Map<String, Object> s = solicitud(sesion, UUID.randomUUID().toString());
        s.put("monto", 1);

        JsonNode r = pagar(s);
        assertEquals("APROBADO", r.get("estado").asText(), r.toString());
        assertTrue(r.get("finalizado").asBoolean());
        assertEquals(0, new BigDecimal("100.00").compareTo(r.get("montoTotal").decimalValue()));
        assertEquals(2, r.get("compra").get("pasajes").size());
        assertTrue(r.get("compra").get("pasajes").get(0).get("documento").asText().contains("****"));
        assertTrue(r.get("compra").get("idPagoProveedor").asText().startsWith("chr_test_"));

        ArgumentCaptor<SolicitudCargo> enviada = ArgumentCaptor.forClass(SolicitudCargo.class);
        verify(culqi, times(1)).crearCargo(enviada.capture());
        assertEquals(0, new BigDecimal("100.00").compareTo(enviada.getValue().monto()));
        assertEquals(TOKEN_TARJETA, enviada.getValue().token());
        assertNull(enviada.getValue().autenticacion3ds());

        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta WHERE estado_venta='PAGADA' AND monto_total=100.00 "
                + "AND entorno='SANDBOX'"));
        assertEquals(1, cuenta("SELECT COUNT(*) FROM pago p JOIN metodo_pago m ON m.id_metodo_pago=p.id_metodo_pago "
                + "WHERE p.estado_pago='APROBADO' AND p.monto=100.00 AND m.nombre_metodo='Culqi - Tarjeta'"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM pasaje"));
        assertEquals(1, cuenta("SELECT COUNT(*) FROM operacion_pago WHERE estado='APROBADO' AND id_venta IS NOT NULL "
                + "AND datos_pasajeros IS NULL AND culqi_charge_id IS NOT NULL AND terminos_aceptados_en IS NOT NULL "
                + "AND terminos_version IS NOT NULL AND email_pagador='comprador@example.com'"));
    }

    @Test
    void sinAceptarLosTerminosNoSeCobraNada() throws Exception {
        String sesion = reservaLista(1);
        Map<String, Object> s = solicitud(sesion, UUID.randomUUID().toString());
        s.put("aceptaTerminos", false);
        var r = enviar("POST", "/api/pagos", s, jwt);
        assertEquals(400, r.statusCode(), r.body());
        verify(culqi, never()).crearCargo(any());
        assertEquals(0, cuenta("SELECT COUNT(*) FROM operacion_pago"));

        s.remove("aceptaTerminos");
        assertEquals(400, enviar("POST", "/api/pagos", s, jwt).statusCode());
        verify(culqi, never()).crearCargo(any());
    }

    @Test
    void tokenQueNoEsDeCulqiSeRechazaAntesDeCobrar() throws Exception {
        String sesion = reservaLista(1);
        Map<String, Object> s = solicitud(sesion, UUID.randomUUID().toString());
        s.put("token", "APP_USR-token-de-otro-proveedor");
        assertEquals(400, enviar("POST", "/api/pagos", s, jwt).statusCode());
        s.put("token", TOKEN_YAPE);
        assertEquals(400, enviar("POST", "/api/pagos", s, jwt).statusCode(), "token de Yape con medio TARJETA");
        verify(culqi, never()).crearCargo(any());
    }

    @Test
    void pagoConYapeUsaElMetodoYape() throws Exception {
        String sesion = reservaLista(1);
        alCobrar("venta_exitosa", "AUT0000");
        Map<String, Object> s = solicitud(sesion, UUID.randomUUID().toString());
        s.put("medioPago", "YAPE");
        s.put("token", TOKEN_YAPE);
        assertEquals("APROBADO", pagar(s).get("estado").asText());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM pago p JOIN metodo_pago m ON m.id_metodo_pago=p.id_metodo_pago "
                + "WHERE m.nombre_metodo='Culqi - Yape'"));
    }

    @Test
    void pagoRechazadoNoRegistraNadaYPermiteReintentar() throws Exception {
        String sesion = reservaLista(1);
        doThrow(new ErrorCulqiException(ErrorCulqiException.Tipo.PAGO_RECHAZADO, 402, "insufficient_funds", "x", null,
                null, null)).when(culqi).crearCargo(any());
        JsonNode r = pagar(solicitud(sesion, UUID.randomUUID().toString()));
        assertEquals("RECHAZADO", r.get("estado").asText());
        assertTrue(r.get("reintentable").asBoolean());
        assertTrue(r.get("mensaje").asText().contains("fondos"));
        assertNotNull(r.get("sesion").get("tokenSesion").asText());
        assertSinCompra();

        String renovada = r.get("sesion").get("tokenSesion").asText();
        reset(culqi);
        alCobrar("venta_exitosa", "AUT0000");
        JsonNode r2 = pagar(solicitud(renovada, UUID.randomUUID().toString()));
        assertEquals("APROBADO", r2.get("estado").asText());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM operacion_pago"));
    }

    @Test
    void errorDeSolicitudNoGeneraCompraYEsReintentable() throws Exception {
        String sesion = reservaLista(1);
        doThrow(new ErrorCulqiException(ErrorCulqiException.Tipo.SOLICITUD_INVALIDA, 400, "parameter_error", "x", null,
                null, null)).when(culqi).crearCargo(any());
        JsonNode r = pagar(solicitud(sesion, UUID.randomUUID().toString()));
        assertEquals("ERROR", r.get("estado").asText());
        assertTrue(r.get("reintentable").asBoolean());
        assertSinCompra();
    }

    @Test
    void autenticacion3dsSeCompletaConLosParametrosDelBanco() throws Exception {
        String sesion = reservaLista(1);
        when(culqi.crearCargo(any())).thenReturn(CargoCulqi.pendiente3ds("Requiere autenticación"));
        JsonNode r = pagar(solicitud(sesion, UUID.randomUUID().toString()));
        assertEquals("ACCION_REQUERIDA", r.get("estado").asText());
        assertTrue(r.get("requiere3ds").asBoolean());
        assertFalse(r.get("finalizado").asBoolean());
        assertSinCompra();
        String referencia = r.get("referencia").asText();

        reset(culqi);
        when(culqi.configurado()).thenReturn(true);
        alCobrar("venta_exitosa", "AUT0000");
        Map<String, Object> confirmacion = Map.of("token", TOKEN_TARJETA, "parametros", Map.of("eci", "05",
                "xid", "xid-de-prueba", "cavv", "cavv-de-prueba", "protocolVersion", "2.2.0",
                "directoryServerTransactionId", "ds-trans-id"));
        var respuesta = enviar("POST", "/api/pagos/" + referencia + "/3ds", confirmacion, jwt);
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        assertEquals("APROBADO", json.readTree(respuesta.body()).get("estado").asText());

        ArgumentCaptor<SolicitudCargo> enviada = ArgumentCaptor.forClass(SolicitudCargo.class);
        verify(culqi, times(1)).crearCargo(enviada.capture());
        assertNotNull(enviada.getValue().autenticacion3ds());
        assertEquals("05", enviada.getValue().autenticacion3ds().eci());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
    }

    @Test
    void confirmar3dsSinOperacionEnEsperaNoCobra() throws Exception {
        String sesion = reservaLista(1);
        alCobrar("venta_exitosa", "AUT0000");
        String referencia = pagar(solicitud(sesion, UUID.randomUUID().toString())).get("referencia").asText();
        reset(culqi);
        Map<String, Object> confirmacion = Map.of("token", TOKEN_TARJETA, "parametros", Map.of("eci", "05",
                "xid", "x", "cavv", "c", "protocolVersion", "2.2.0", "directoryServerTransactionId", "d"));
        var r = enviar("POST", "/api/pagos/" + referencia + "/3ds", confirmacion, jwt);
        assertEquals(200, r.statusCode(), r.body());
        verify(culqi, never()).crearCargo(any());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
    }

    @Test
    void elMismoIntentoRepetidoNoCobraDosVeces() throws Exception {
        String sesion = reservaLista(1);
        alCobrar("venta_exitosa", "AUT0000");
        Map<String, Object> s = solicitud(sesion, UUID.randomUUID().toString());
        JsonNode primera = pagar(s);
        JsonNode segunda = pagar(s);
        assertEquals(primera.get("referencia").asText(), segunda.get("referencia").asText());
        verify(culqi, times(1)).crearCargo(any());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
    }

    @Test
    void resultadoDesconocidoSeResuelveConLaConciliacion() throws Exception {
        String sesion = reservaLista(1);
        doThrow(new ErrorCulqiException(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO, "timeout"))
                .when(culqi).crearCargo(any());
        JsonNode r = pagar(solicitud(sesion, UUID.randomUUID().toString()));
        assertEquals("CREANDO", r.get("estado").asText());
        assertSinCompra();
        String referencia = r.get("referencia").asText();

        when(culqi.buscarPorReferencia(eq(referencia), anyString(), any(), any())).thenReturn(
                Optional.of(cargo("chr_test_ConciliadoAbc123", "venta_exitosa", "AUT0000", referencia, "50.00")));
        assertEquals("APROBADO", consultar(referencia).get("estado").asText());
        assertEquals(1, cuenta("SELECT COUNT(*) FROM venta"));
    }

    @Test
    void cargoAprobadoConImporteDistintoNoGeneraCompra() throws Exception {
        String sesion = reservaLista(1);
        doAnswer(inv -> {
            SolicitudCargo s = inv.getArgument(0);
            return cargo("chr_test_ImporteDistinto01", "venta_exitosa", "AUT0000", s.referenciaExterna(), "10.00");
        }).when(culqi).crearCargo(any());
        when(culqi.reembolsar(anyString(), any(), anyString())).thenReturn("ref_test_Devolucion01");
        JsonNode r = pagar(solicitud(sesion, UUID.randomUUID().toString()));
        assertEquals("REEMBOLSADO", r.get("estado").asText(), r.toString());
        assertSinCompra();
        verify(culqi, times(1)).reembolsar(eq("chr_test_ImporteDistinto01"), any(), anyString());
    }

    @Test
    void consultarElPagoDeOtroUsuarioDevuelve404() throws Exception {
        String sesion = reservaLista(1);
        alCobrar("venta_exitosa", "AUT0000");
        String referencia = pagar(solicitud(sesion, UUID.randomUUID().toString())).get("referencia").asText();
        String otro = jwtUsuario();
        assertEquals(404, enviar("GET", "/api/pagos/" + referencia, null, otro).statusCode());
        assertEquals(401, enviar("GET", "/api/pagos/" + referencia, null, null).statusCode());
    }
}
