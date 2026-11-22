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
import com.transportes.viajes.servicios.TokenSesionServicio;

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
    @Autowired TokenSesionServicio tokens;
    final HttpClient http = HttpClient.newHttpClient();

    TokenSesionServicio.SesionReserva sesion;

    int pasajeVigente;   // viaje 19/10 a las 08:00, compra de un cliente
    int pasajeCancelado; // viaje 25/10 cancelado
    String jwtAgencia;
    String jwtGerente;
    String jwtCliente;

    @BeforeEach
    void preparar() throws Exception {
        // Hoy es 12/10/2026 a las 10:00 (hora de Perú).
        reloj.fijar(LocalDateTime.of(2026, 10, 12, 10, 0));
        for (String tabla : List.of("postergacion", "comprobante", "pasaje", "pago", "operacion_pago", "venta", "empleado",
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
        insertarViaje(8, "2026-10-21", "PROGRAMADO");
        insertarAsiento(1, "12A", 5);
        insertarAsiento(2, "05A", 7);
        insertarAsiento(3, "14A", 8, "55.00");
        // El agente ya eligió el asiento 4 del viaje 8 (misma tarifa, S/ 43.00): está bloqueado por su sesión.
        sesion = tokens.crear(8L);
        insertarAsientoBloqueado(4, "15A", 8, "43.00", sesion.idSesion());
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

    // ---------- cotización ----------

    @Test
    void elAgenteCotizaUnViajeMasCaro() throws Exception {
        // Pasaje de S/ 43.00 → asiento 3 del viaje 8, que cuesta S/ 55.00.
        var r = get("/api/pasajes/" + pasajeVigente + "/cambio-viaje/cotizacion?idViajeNuevo=8&idAsiento=3", jwtAgencia);
        assertEquals(200, r.statusCode(), r.body());
        assertEquals("SUPERIOR", cuerpo(r).get("escenario").asText());
        assertEquals(12.00, cuerpo(r).get("montoAPagar").asDouble());
        assertTrue(cuerpo(r).get("requierePago").asBoolean());
    }

    @Test
    void elGerenteNoPuedeCotizar() throws Exception {
        var r = get("/api/pasajes/" + pasajeVigente + "/cambio-viaje/cotizacion?idViajeNuevo=8&idAsiento=3", jwtGerente);
        assertEquals(403, r.statusCode());
    }

    // ---------- confirmación sin cobro ----------

    @Test
    void elAgenteConfirmaElCambioYQuedaRegistradoQuienLoHizo() throws Exception {
        var r = confirmar(jwtAgencia, 8, 4, false);
        assertEquals(200, r.statusCode(), r.body());
        assertEquals("15A", cuerpo(r).get("asientoNuevo").asText());
        assertEquals("2026-10-21", cuerpo(r).get("fechaSalida").asText());

        // El pasaje pasó al asiento nuevo (OCUPADO) y el anterior quedó DISPONIBLE.
        assertEquals(4, idAsientoDelPasaje(pasajeVigente));
        assertEquals("OCUPADO", estadoAsiento(4));
        assertEquals("DISPONIBLE", estadoAsiento(1));

        // Misma venta, sin cobro, y con el agente en el historial.
        var fila = jdbc.queryForMap("SELECT * FROM postergacion WHERE id_pasaje = ?", pasajeVigente);
        assertEquals(0, BigDecimal.ZERO.compareTo((BigDecimal) fila.get("importe_adicional")));
        int idEmpleadoAgencia = jdbc.queryForObject("SELECT id_empleado FROM empleado WHERE rol = 'AGENCIA'", Integer.class);
        assertEquals(idEmpleadoAgencia, ((Number) fila.get("id_empleado")).intValue());
    }

    @Test
    void siElAsientoYaSeVendioElPasajeNoCambia() throws Exception {
        jdbc.update("UPDATE viaje_asiento SET estado_viaje_asiento = 'OCUPADO' WHERE id_viaje_asiento = 4");
        var r = confirmar(jwtAgencia, 8, 4, false);
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("ASIENTO_NO_DISPONIBLE", cuerpo(r).get("detalles").get(0).asText());
        assertEquals(1, idAsientoDelPasaje(pasajeVigente));
        assertEquals("OCUPADO", estadoAsiento(1));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM postergacion", Integer.class));
    }

    @Test
    void elGerenteNoPuedeConfirmar() throws Exception {
        assertEquals(403, confirmar(jwtGerente, 8, 4, false).statusCode());
        assertEquals(1, idAsientoDelPasaje(pasajeVigente));
    }

    // ---------- datos de prueba ----------

    HttpResponse<String> confirmar(String jwt, int idViajeNuevo, int idAsiento, boolean aceptaSinDevolucion)
            throws Exception {
        String cuerpo = json.writeValueAsString(Map.of("idViajeNuevo", idViajeNuevo, "idAsiento", idAsiento,
                "tokenSesion", sesion.tokenSesion(), "aceptaSinDevolucion", aceptaSinDevolucion));
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port
                        + "/api/pasajes/" + pasajeVigente + "/cambio-viaje/confirmar"))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + jwt)
                .POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build(), HttpResponse.BodyHandlers.ofString());
    }

    int idAsientoDelPasaje(int idPasaje) {
        return jdbc.queryForObject("SELECT id_viaje_asiento FROM pasaje WHERE id_pasaje = ?", Integer.class, idPasaje);
    }

    String estadoAsiento(int idViajeAsiento) {
        return jdbc.queryForObject("SELECT estado_viaje_asiento FROM viaje_asiento WHERE id_viaje_asiento = ?",
                String.class, idViajeAsiento);
    }

    void insertarAsientoBloqueado(int id, String numero, int viaje, String precio, String idSesion) {
        jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", id, numero);
        jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento,"
                + "token_bloqueo,fecha_expiracion_bloqueo) VALUES(?,?,?,'BLOQUEADO_TEMPORAL',?,?,?)",
                id, viaje, new BigDecimal(precio), id, idSesion, LocalDateTime.now().plusMinutes(10));
    }

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
        insertarAsiento(id, numero, viaje, "43.00");
    }

    void insertarAsiento(int id, String numero, int viaje, String precio) {
        jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", id, numero);
        jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento) "
                + "VALUES(?,?,?,'OCUPADO',?)", id, viaje, new BigDecimal(precio), id);
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
