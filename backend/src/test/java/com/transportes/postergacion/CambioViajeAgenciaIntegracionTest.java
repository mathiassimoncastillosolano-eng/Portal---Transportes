package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import com.transportes.RelojPruebaConfiguracion;
import com.transportes.RelojPruebaConfiguracion.RelojPrueba;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Cambio de viajes desde el Sistema Empresarial, de punta a punta (JWT real → controlador → SQL en H2).
 * Revisa quién puede usarlo (solo AGENCIA) y la elegibilidad del pasaje de cualquier cliente.
 */
@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:cambioviaje;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,"
            + "classpath:schema-compras-test.sql,classpath:schema-cambio-viaje-test.sql"
})
class CambioViajeAgenciaIntegracionTest {

    static final String CLAVE = "ClaveCambioViaje2026!";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired RelojPrueba reloj;
    @Autowired PasswordEncoder encoder;
    final HttpClient http = HttpClient.newHttpClient();

    int pasajeVigente;   // viaje 19/10 a las 08:00, compra de un cliente
    int pasajeCancelado; // viaje 25/10 cancelado
    String jwtAgencia;
    String jwtGerente;
    String jwtCliente;

    @BeforeEach
    void preparar() throws Exception {
        // Hoy es 12/10/2026 a las 10:00 (hora de Perú).
        reloj.fijar(LocalDateTime.of(2026, 10, 12, 10, 0));
        for (String tabla : List.of("comprobante", "pasaje", "pago", "operacion_pago", "venta", "empleado",
                "usuario", "viaje_asiento", "pasajero", "asiento", "viaje", "bus", "programacion_viaje", "ruta",
                "agencia", "tipo_bus", "ubicacion")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO ubicacion(id_ubicacion,nombre,activa) OVERRIDING SYSTEM VALUE VALUES(1,'Lima',true),(2,'Cusco',true)");
        jdbc.update("INSERT INTO agencia(id_agencia,id_ubicacion,activa,nombre_agencia) "
                + "VALUES(1,1,true,'Ruta Libre - Lima'),(2,2,true,'Ruta Libre - Cusco')");
        jdbc.update("INSERT INTO ruta(id_ruta,id_agencia_origen,id_agencia_destino,activa) VALUES(1,1,2,true)");
        jdbc.update("INSERT INTO programacion_viaje(id_programacion,id_ruta,activa) VALUES(1,1,true)");
        jdbc.update("INSERT INTO tipo_bus(id_tipo_bus,nombre_tipo) OVERRIDING SYSTEM VALUE VALUES(1,'Bus Cama')");
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,1,true)");
        insertarViaje(5, "2026-10-19", "PROGRAMADO");
        insertarViaje(7, "2026-10-25", "CANCELADO");
        insertarAsiento(1, "12A", 5);
        insertarAsiento(2, "05A", 7);
        jdbc.update("INSERT INTO pasajero(id_pasajero,tipo_documento,numero_documento,nombres,apellidos) OVERRIDING SYSTEM VALUE "
                + "VALUES(1,'DNI','11111111','ANA','LOPEZ')");

        int cliente = crearUsuario("cliente");
        pasajeVigente = insertarPasaje(insertarVenta(cliente), 1, 1);
        pasajeCancelado = insertarPasaje(insertarVenta(cliente), 1, 2);

        jwtAgencia = tokenEmpleado("AGENCIA");
        jwtGerente = tokenEmpleado("GERENTE");
        jwtCliente = tokenCliente("cliente");
    }

    // ---------- quién puede usarlo ----------

    @Test
    void sinSesionNoSePuedeConsultar() throws Exception {
        assertEquals(401, get(elegibilidad(pasajeVigente), null).statusCode());
    }

    @Test
    void elGerenteNoPuedeCambiarViajes() throws Exception {
        assertEquals(403, get(elegibilidad(pasajeVigente), jwtGerente).statusCode());
    }

    @Test
    void unClienteDelPortalNoPuedeUsarLaRutaDeAgencia() throws Exception {
        assertEquals(403, get(elegibilidad(pasajeVigente), jwtCliente).statusCode());
    }

    @Test
    void elGerenteSigueViendoElListadoDePasajes() throws Exception {
        // La regla nueva solo afecta a /cambio-viaje: el listado del SE sigue igual para el gerente.
        assertEquals(200, get("/api/pasajes/opciones", jwtGerente).statusCode());
    }

    // ---------- elegibilidad ----------

    @Test
    void elAgenteVeQueElPasajeDeUnClienteSePuedeCambiar() throws Exception {
        var r = get(elegibilidad(pasajeVigente), jwtAgencia);
        assertEquals(200, r.statusCode(), r.body());
        assertTrue(cuerpo(r).get("elegible").asBoolean());
    }

    @Test
    void unPasajeNoVigenteNoEsElegibleYDiceElMotivo() throws Exception {
        var r = get(elegibilidad(pasajeCancelado), jwtAgencia);
        assertEquals(200, r.statusCode(), r.body());
        assertFalse(cuerpo(r).get("elegible").asBoolean());
        assertEquals("PASAJE_NO_VIGENTE", cuerpo(r).get("codigo").asText());
    }

    @Test
    void faltandoMenosDe6HorasNoEsElegible() throws Exception {
        // El viaje sale el 19/10 a las 08:00; a las 02:01 faltan 5 h 59 min.
        reloj.fijar(LocalDateTime.of(2026, 10, 19, 2, 1));
        var r = get(elegibilidad(pasajeVigente), jwtAgencia);
        assertEquals(200, r.statusCode(), r.body());
        assertFalse(cuerpo(r).get("elegible").asBoolean());
        assertEquals("ANTICIPACION_INSUFICIENTE", cuerpo(r).get("codigo").asText());
    }

    @Test
    void unPasajeQueNoExisteResponde404() throws Exception {
        assertEquals(404, get(elegibilidad(999999), jwtAgencia).statusCode());
    }

    // ---------- viajes ----------

    @Test
    void consultarViajesConMenosDe6HorasSeRechazaConElCodigo() throws Exception {
        reloj.fijar(LocalDateTime.of(2026, 10, 19, 2, 1));
        var r = get("/api/pasajes/" + pasajeVigente + "/cambio-viaje/viajes?origen=Lima&destino=Cusco&fecha=2026-10-21",
                jwtAgencia);
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("ANTICIPACION_INSUFICIENTE", cuerpo(r).get("detalles").get(0).asText());
    }

    // ---------- datos de prueba ----------

    String elegibilidad(int idPasaje) {
        return "/api/pasajes/" + idPasaje + "/cambio-viaje/elegibilidad";
    }

    JsonNode cuerpo(HttpResponse<String> respuesta) throws Exception {
        return json.readTree(respuesta.body());
    }

    void insertarViaje(int id, String fecha, String estado) {
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(?,1,1,DATE '" + fecha + "',CAST('08:00:00' AS TIME),?)", id, estado);
    }

    void insertarAsiento(int id, String numero, int viaje) {
        jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", id, numero);
        jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento) "
                + "VALUES(?,?,43,'OCUPADO',?)", id, viaje, id);
    }

    int insertarVenta(int idUsuario) {
        jdbc.update("INSERT INTO venta(id_usuario,monto_total,estado_venta) VALUES(?,43,'PAGADA')", idUsuario);
        int id = jdbc.queryForObject("SELECT MAX(id_venta) FROM venta", Integer.class);
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo) SELECT 'Prueba' WHERE NOT EXISTS (SELECT 1 FROM metodo_pago)");
        int metodo = jdbc.queryForObject("SELECT MIN(id_metodo_pago) FROM metodo_pago", Integer.class);
        jdbc.update("INSERT INTO pago(id_venta,id_metodo_pago,monto,estado_pago) VALUES(?,?,43,'APROBADO')", id, metodo);
        return id;
    }

    int insertarPasaje(int idVenta, int idPasajero, int idViajeAsiento) {
        jdbc.update("INSERT INTO pasaje(id_venta,id_pasajero,id_viaje_asiento,precio) VALUES(?,?,?,?)",
                idVenta, idPasajero, idViajeAsiento, new BigDecimal("43.00"));
        return jdbc.queryForObject("SELECT MAX(id_pasaje) FROM pasaje", Integer.class);
    }

    String correo(String alias) {
        return "cambio-viaje-" + alias + "@example.com";
    }

    int crearUsuario(String alias) {
        jdbc.update("INSERT INTO usuario(nombres,apellidos,correo,contrasena_hash) VALUES('Prueba',?,?,?)",
                alias.toUpperCase(), correo(alias), encoder.encode(CLAVE));
        return jdbc.queryForObject("SELECT id_usuario FROM usuario WHERE correo = ?", Integer.class, correo(alias));
    }

    /** Crea un empleado con el rol indicado, inicia sesión en el Sistema Empresarial y devuelve su JWT. */
    String tokenEmpleado(String rol) throws Exception {
        int id = crearUsuario(rol.toLowerCase());
        jdbc.update("INSERT INTO empleado(id_usuario,rol,id_agencia) VALUES(?,?,?)", id, rol,
                rol.equals("AGENCIA") ? 1L : null);
        return login("/api/auth/login-empresarial", correo(rol.toLowerCase()));
    }

    /** Inicia sesión en el Portal con un usuario ya creado y devuelve su JWT. */
    String tokenCliente(String alias) throws Exception {
        return login("/api/auth/login", correo(alias));
    }

    String login(String ruta, String correo) throws Exception {
        var r = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(
                        Map.of("correo", correo, "contrasena", CLAVE)))).build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(200, r.statusCode(), r.body());
        return json.readTree(r.body()).get("token").asText();
    }

    HttpResponse<String> get(String ruta, String jwt) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).GET();
        if (jwt != null) b.header("Authorization", "Bearer " + jwt);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }
}
