package com.transportes.compras;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.transportes.RelojPruebaConfiguracion;
import com.transportes.RelojPruebaConfiguracion.RelojPrueba;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Mis pasajes, detalle, historial y resumen contra H2, de punta a punta (JWT real → controlador → SQL).
 * Cubre sobre todo la autorizacion: un usuario nunca ve ni abre compras de otro.
 */
@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:compras;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,classpath:schema-compras-test.sql"
})
class ComprasIntegracionTest {

    static final String CLAVE = "ClaveCompras2026!";
    static final String BASE = "/api/usuarios/perfil";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired RelojPrueba reloj;
    final HttpClient http = HttpClient.newHttpClient();

    int idVentaA1;   // 2 pasajes, viaje futuro, con comprobante
    int idVentaA2;   // 1 pasaje, viaje pasado
    int idVentaA3;   // 1 pasaje, viaje cancelado
    int idVentaB1;   // compra de OTRO usuario
    String jwtA;
    String jwtB;
    String jwtSinCompras;

    @BeforeEach
    void preparar() throws Exception {
        // Hora de negocio fija: hoy es 12/10/2026 10:00 (Lima).
        reloj.fijar(LocalDateTime.of(2026, 10, 12, 10, 0));
        for (String tabla : List.of("comprobante", "pasaje", "pago", "operacion_pago", "venta", "viaje_asiento",
                "pasajero", "asiento", "viaje", "bus", "programacion_viaje", "ruta", "agencia", "tipo_bus",
                "ubicacion")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO ubicacion(id_ubicacion,nombre,activa) OVERRIDING SYSTEM VALUE VALUES(1,'Lima',true),(2,'Cusco',true)");
        jdbc.update("INSERT INTO agencia(id_agencia,id_ubicacion,activa) VALUES(1,1,true),(2,2,true)");
        jdbc.update("INSERT INTO ruta(id_ruta,id_agencia_origen,id_agencia_destino,activa) VALUES(1,1,2,true)");
        jdbc.update("INSERT INTO programacion_viaje(id_programacion,id_ruta,activa) VALUES(1,1,true)");
        jdbc.update("INSERT INTO tipo_bus(id_tipo_bus,nombre_tipo) OVERRIDING SYSTEM VALUE VALUES(1,'Bus Cama')");
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,1,true)");
        insertarViaje(5, "2026-10-19", "PROGRAMADO");
        insertarViaje(6, "2026-09-01", "PROGRAMADO");
        insertarViaje(7, "2026-10-25", "CANCELADO");
        insertarAsiento(1, "12A", 5, 95);
        insertarAsiento(2, "12B", 5, 95);
        insertarAsiento(3, "03A", 6, 50);
        insertarAsiento(4, "05A", 7, 40);
        insertarAsiento(5, "13A", 5, 95);
        jdbc.update("INSERT INTO pasajero(id_pasajero,tipo_documento,numero_documento,nombres,apellidos) OVERRIDING SYSTEM VALUE "
                + "VALUES(1,'DNI','11111111','ANA','LOPEZ'),(2,'DNI','22222222','LUIS','PEREZ'),(3,'DNI','33333333','OTRA','PERSONA')");

        jwtA = jwtUsuario("a");
        jwtB = jwtUsuario("b");
        jwtSinCompras = jwtUsuario("c");
        int idA = idUsuario("a");
        int idB = idUsuario("b");

        idVentaA1 = insertarVenta(idA, "190.00");
        insertarPasaje(idVentaA1, 1, 1, "95.00");
        insertarPasaje(idVentaA1, 2, 2, "95.00");
        jdbc.update("INSERT INTO comprobante(id_venta,serie,numero,tipo_comprobante) VALUES(?,'B001','00000042','BOLETA')", idVentaA1);

        idVentaA2 = insertarVenta(idA, "50.00");
        insertarPasaje(idVentaA2, 1, 3, "50.00");

        idVentaA3 = insertarVenta(idA, "40.00");
        insertarPasaje(idVentaA3, 1, 4, "40.00");

        idVentaB1 = insertarVenta(idB, "95.00");
        insertarPasaje(idVentaB1, 3, 5, "95.00");
    }

    // ---------- datos de prueba ----------

    void insertarViaje(int id, String fecha, String estado) {
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(?,1,1,DATE '" + fecha + "',CAST('08:00:00' AS TIME),?)", id, estado);
    }

    void insertarAsiento(int id, String numero, int viaje, int precio) {
        jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", id, numero);
        jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento) "
                + "VALUES(?,?,?,'OCUPADO',?)", id, viaje, precio, id);
    }

    /** Venta pagada con su pago aprobado (el flujo real escribe PAGADA/APROBADO). */
    int insertarVenta(int idUsuario, String monto) {
        jdbc.update("INSERT INTO venta(id_usuario,monto_total,estado_venta) VALUES(?,?,'PAGADA')",
                idUsuario, new java.math.BigDecimal(monto));
        int id = jdbc.queryForObject("SELECT MAX(id_venta) FROM venta", Integer.class);
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo) SELECT 'Prueba' WHERE NOT EXISTS (SELECT 1 FROM metodo_pago)");
        int metodo = jdbc.queryForObject("SELECT MIN(id_metodo_pago) FROM metodo_pago", Integer.class);
        jdbc.update("INSERT INTO pago(id_venta,id_metodo_pago,monto,estado_pago) VALUES(?,?,?,'APROBADO')",
                id, metodo, new java.math.BigDecimal(monto));
        return id;
    }

    void insertarPasaje(int idVenta, int idPasajero, int idViajeAsiento, String precio) {
        jdbc.update("INSERT INTO pasaje(id_venta,id_pasajero,id_viaje_asiento,precio) VALUES(?,?,?,?)",
                idVenta, idPasajero, idViajeAsiento, new java.math.BigDecimal(precio));
    }

    // ---------- utilidades HTTP ----------

    HttpResponse<String> get(String ruta, String jwt) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).GET();
        if (jwt != null) b.header("Authorization", "Bearer " + jwt);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> post(String ruta, Object cuerpo) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo))).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    String correo(String alias) {
        return "compras-" + alias + "@example.com";
    }

    String jwtUsuario(String alias) throws Exception {
        jdbc.update("DELETE FROM usuario WHERE correo = ?", correo(alias));
        var registro = post("/api/usuarios/registro",
                Map.of("nombres", "Usuario", "apellidos", alias.toUpperCase() + UUID.randomUUID().toString().substring(0, 4),
                        "correo", correo(alias), "contrasena", CLAVE));
        assertEquals(201, registro.statusCode(), registro.body());
        var login = post("/api/auth/login", Map.of("correo", correo(alias), "contrasena", CLAVE));
        assertEquals(200, login.statusCode(), login.body());
        return json.readTree(login.body()).get("token").asText();
    }

    int idUsuario(String alias) {
        return jdbc.queryForObject("SELECT id_usuario FROM usuario WHERE correo = ?", Integer.class, correo(alias));
    }

    // ---------- pruebas ----------

    @Test
    void sinTokenNingunEndpointDeComprasResponde() throws Exception {
        for (String ruta : List.of(BASE + "/resumen", BASE + "/pasajes", BASE + "/historial",
                BASE + "/pasajes/" + idVentaA1)) {
            assertEquals(401, get(ruta, null).statusCode(), ruta);
        }
    }

    @Test
    void misPasajesMuestraSoloLasComprasDelUsuarioAutenticado() throws Exception {
        var r = get(BASE + "/pasajes", jwtA);
        assertEquals(200, r.statusCode(), r.body());
        JsonNode datos = json.readTree(r.body());

        assertEquals(1, datos.get("comprasVigentes").asInt());
        JsonNode compras = datos.get("compras");
        assertEquals(3, compras.size());
        for (JsonNode compra : compras) {
            assertTrue(compra.get("idVenta").asInt() != idVentaB1, "no debe aparecer la compra de otro usuario");
        }
        // La vigente va primero.
        JsonNode primera = compras.get(0);
        assertEquals(idVentaA1, primera.get("idVenta").asInt());
        assertTrue(primera.get("vigente").asBoolean());
        assertEquals("CONFIRMADA", primera.get("estado").asText());
        assertEquals("Lima", primera.get("origen").asText());
        assertEquals("Cusco", primera.get("destino").asText());
        assertEquals("2026-10-19", primera.get("fechaSalida").asText());
        assertEquals("08:00", primera.get("horaSalida").asText());
        assertEquals("Bus Cama", primera.get("tipoBus").asText());
        assertEquals("B001-00000042", primera.get("comprobante").asText());
    }

    @Test
    void unaCompraConVariosPasajesMuestraTodosSusBoletosSinDuplicarImportes() throws Exception {
        var r = get(BASE + "/pasajes/" + idVentaA1, jwtA);
        assertEquals(200, r.statusCode(), r.body());
        JsonNode compra = json.readTree(r.body());

        JsonNode boletos = compra.get("boletos");
        assertEquals(2, boletos.size());
        assertEquals("12A", boletos.get(0).get("asiento").asText());
        assertEquals("12B", boletos.get(1).get("asiento").asText());
        assertEquals("ANA LOPEZ", boletos.get(0).get("pasajero").asText());
        assertEquals("DNI ****111", boletos.get(0).get("documento").asText());
        assertEquals(95.0, boletos.get(0).get("precio").asDouble());
        assertEquals(190.0, compra.get("total").asDouble());
        assertEquals(190.0, compra.get("totalPasajes").asDouble());
        assertTrue(compra.get("totalConsistente").asBoolean());
        assertFalse(compra.get("incompleta").asBoolean());
        assertTrue(compra.get("documentoDisponible").asBoolean());
        // Nunca se expone el documento completo del pasajero.
        assertFalse(r.body().contains("11111111"));
    }

    @Test
    void noSePuedeAbrirUnaCompraAjenaCambiandoElIdentificador() throws Exception {
        var ajena = get(BASE + "/pasajes/" + idVentaB1, jwtA);
        var inexistente = get(BASE + "/pasajes/999999", jwtA);
        assertEquals(404, ajena.statusCode(), ajena.body());
        assertEquals(404, inexistente.statusCode());
        // Misma respuesta: no revela si la venta existe.
        assertEquals(json.readTree(inexistente.body()).get("mensaje").asText(),
                json.readTree(ajena.body()).get("mensaje").asText());
        assertFalse(ajena.body().contains("13A"));
        // Y el propietario real si puede.
        assertEquals(200, get(BASE + "/pasajes/" + idVentaB1, jwtB).statusCode());
    }

    @Test
    void unIdentificadorNoNumericoEsUnaSolicitudInvalida() throws Exception {
        assertEquals(400, get(BASE + "/pasajes/abc", jwtA).statusCode());
    }

    @Test
    void elHistorialExcluyeLoVigenteYDistingueRealizadoDeCancelado() throws Exception {
        var r = get(BASE + "/historial", jwtA);
        assertEquals(200, r.statusCode(), r.body());
        JsonNode historial = json.readTree(r.body());
        assertEquals(2, historial.size());
        // Mas reciente primero: el cancelado (25/10) antes que el pasado (01/09).
        assertEquals(idVentaA3, historial.get(0).get("idVenta").asInt());
        assertEquals("NO_REALIZADO", historial.get(0).get("fase").asText());
        assertEquals("CANCELADO", historial.get(0).get("estadoViaje").asText());
        assertFalse(historial.get(0).get("documentoDisponible").asBoolean());
        assertEquals(idVentaA2, historial.get(1).get("idVenta").asInt());
        assertEquals("REALIZADO", historial.get(1).get("fase").asText());
    }

    @Test
    void elResumenCuentaPasajesViajesYTicketsReales() throws Exception {
        var r = get(BASE + "/resumen", jwtA);
        assertEquals(200, r.statusCode(), r.body());
        JsonNode resumen = json.readTree(r.body());
        assertEquals(4, resumen.get("pasajes").asInt());            // 2 + 1 + 1
        assertEquals(1, resumen.get("viajesCompletados").asInt());  // solo el viaje 6
        assertEquals(3, resumen.get("tickets").asInt());            // el del viaje cancelado no
        assertEquals(1, resumen.get("comprasVigentes").asInt());

        JsonNode deB = json.readTree(get(BASE + "/resumen", jwtB).body());
        assertEquals(1, deB.get("pasajes").asInt());
    }

    @Test
    void elPerfilYaNoDevuelveEstadisticasFijasEnCero() throws Exception {
        var r = get("/api/usuarios/perfil", jwtA);
        assertEquals(200, r.statusCode(), r.body());
        JsonNode estadisticas = json.readTree(r.body()).get("estadisticas");
        assertEquals(4, estadisticas.get("pasajes").asInt());
        assertEquals(1, estadisticas.get("viajes").asInt());
        assertEquals(3, estadisticas.get("tickets").asInt());
    }

    @Test
    void unUsuarioSinComprasRecibeListasVaciasYCeros() throws Exception {
        JsonNode pasajes = json.readTree(get(BASE + "/pasajes", jwtSinCompras).body());
        assertEquals(0, pasajes.get("comprasVigentes").asInt());
        assertEquals(0, pasajes.get("compras").size());
        assertEquals(0, json.readTree(get(BASE + "/historial", jwtSinCompras).body()).size());
        JsonNode resumen = json.readTree(get(BASE + "/resumen", jwtSinCompras).body());
        assertEquals(0, resumen.get("pasajes").asInt());
        assertEquals(0, resumen.get("tickets").asInt());
    }
}
