package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
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

import tools.jackson.databind.ObjectMapper;

/**
 * HU-02 · Consulta de viajes de punta a punta (JWT real → controlador → SQL en H2).
 * Revisa que el servidor rechace antes de buscar: sin sesión, pasaje ajeno, pasaje no vigente y menos de 6 h.
 */
@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:postergacion;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,classpath:schema-compras-test.sql"
})
class PostergacionIntegracionTest {

    static final String CLAVE = "ClavePostergacion2026!";
    static final String CONSULTA = "/viajes?origen=Lima&destino=Cusco&fecha=2026-10-21";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired RelojPrueba reloj;
    final HttpClient http = HttpClient.newHttpClient();

    int pasajeVigente;   // viaje 19/10 a las 08:00
    int pasajeCancelado; // viaje 25/10 cancelado
    int pasajeAjeno;     // de otro usuario
    String jwtA;

    @BeforeEach
    void preparar() throws Exception {
        // Hoy es 12/10/2026 a las 10:00 (hora de Perú).
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
        insertarViaje(7, "2026-10-25", "CANCELADO");
        insertarAsiento(1, "12A", 5);
        insertarAsiento(2, "05A", 7);
        insertarAsiento(3, "13A", 5);
        jdbc.update("INSERT INTO pasajero(id_pasajero,tipo_documento,numero_documento,nombres,apellidos) OVERRIDING SYSTEM VALUE "
                + "VALUES(1,'DNI','11111111','ANA','LOPEZ'),(2,'DNI','22222222','OTRA','PERSONA')");

        jwtA = jwtUsuario("a");
        jwtUsuario("b");
        pasajeVigente = insertarPasaje(insertarVenta(idUsuario("a")), 1, 1);
        pasajeCancelado = insertarPasaje(insertarVenta(idUsuario("a")), 1, 2);
        pasajeAjeno = insertarPasaje(insertarVenta(idUsuario("b")), 2, 3);
    }

    // ---------- pruebas ----------

    @Test
    void sinSesionNoSePuedeConsultar() throws Exception {
        assertEquals(401, get(ruta(pasajeVigente), null).statusCode());
    }

    @Test
    void unPasajeAjenoRespondeComoSiNoExistiera() throws Exception {
        var ajeno = get(ruta(pasajeAjeno), jwtA);
        var inexistente = get(ruta(999999), jwtA);
        assertEquals(404, ajeno.statusCode(), ajeno.body());
        assertEquals(404, inexistente.statusCode());
        assertEquals(mensaje(inexistente), mensaje(ajeno));
    }

    @Test
    void unPasajeNoVigenteSeRechazaConElMotivo() throws Exception {
        var r = get(ruta(pasajeCancelado), jwtA);
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("Este pasaje no está vigente, por eso no se puede cambiar.", mensaje(r));
    }

    @Test
    void faltandoMenosDe6HorasSeRechazaConElMotivo() throws Exception {
        // El viaje sale el 19/10 a las 08:00; a las 02:01 faltan 5 h 59 min.
        reloj.fijar(LocalDateTime.of(2026, 10, 19, 2, 1));
        var r = get(ruta(pasajeVigente), jwtA);
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.", mensaje(r));
    }

    // ---------- datos de prueba ----------

    String ruta(int idPasaje) {
        return "/api/usuarios/postergaciones/" + idPasaje + CONSULTA;
    }

    String mensaje(HttpResponse<String> respuesta) throws Exception {
        return json.readTree(respuesta.body()).get("mensaje").asText();
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
        return "postergacion-" + alias + "@example.com";
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
}
