package com.transportes.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.RelojPruebaConfiguracion;
import com.transportes.RelojPruebaConfiguracion.RelojPrueba;
import com.transportes.dashboard.dto.DashboardDto;
import com.transportes.dashboard.dto.OcupacionViajeDto;
import com.transportes.dashboard.dto.OpcionDto;
import com.transportes.dashboard.dto.OpcionesDashboardDto;
import com.transportes.dashboard.dto.PeriodoDto;
import com.transportes.dashboard.dto.VentaDto;
import com.transportes.dashboard.servicios.DashboardServicio;

import tools.jackson.databind.ObjectMapper;

/**
 * Dashboard del gerente contra H2. Datos de prueba ("hoy" = 12/10/2026 10:00 en Lima):
 *
 *   Ruta 1: Lima (agencia 1) → Cusco      · viaje 4 ya salió (01/10), viaje 5 sale el 19/10 · Bus Cama
 *   Ruta 2: Cusco (agencia 2) → Arequipa  · viaje 6 sale el 21/10 · Prime
 *   Ruta 3: Lima (agencia 4, duplicada de la 1) → Arequipa · viaje 7 sale el 22/10 · Bus Cama
 *
 * Período consultado: 08/10 al 12/10 (5 días) → período anterior: 03/10 al 07/10.
 */
@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:dashboard;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,classpath:schema-dashboard-test.sql"
})
class DashboardIntegracionTest {

    static final String CLAVE = "ClaveDashboard2026!";
    static final String DESDE = "2026-10-08";
    static final String HASTA = "2026-10-12";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired RelojPrueba reloj;
    @Autowired DashboardServicio servicio;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper json;
    final HttpClient http = HttpClient.newHttpClient();

    int idUsuario;

    @BeforeEach
    void preparar() {
        reloj.fijar(LocalDateTime.of(2026, 10, 12, 10, 0));
        for (String tabla : List.of("postergacion", "pasaje", "pago", "operacion_pago", "venta", "viaje_asiento",
                "pasajero", "metodo_pago", "viaje", "bus", "programacion_viaje", "ruta", "agencia", "tipo_bus", "ubicacion",
                "empleado", "usuario")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO ubicacion(id_ubicacion,nombre,activa) OVERRIDING SYSTEM VALUE "
                + "VALUES(1,'Lima',true),(2,'Cusco',true),(3,'Arequipa',true)");
        jdbc.update("INSERT INTO agencia(id_agencia,id_ubicacion,nombre_agencia,activa) VALUES"
                + "(1,1,'Ruta Libre - Lima',true),(2,2,'Ruta Libre - Cusco',true),(3,3,'Ruta Libre - Arequipa',true),"
                + "(4,1,'RutaLibre Lima',true)");
        jdbc.update("INSERT INTO ruta(id_ruta,id_agencia_origen,id_agencia_destino,activa) VALUES(1,1,2,true),(2,2,3,true),(3,4,3,true)");
        jdbc.update("INSERT INTO programacion_viaje(id_programacion,id_ruta,activa) VALUES(1,1,true),(2,2,true),(3,3,true)");
        jdbc.update("INSERT INTO tipo_bus(id_tipo_bus,nombre_tipo) OVERRIDING SYSTEM VALUE VALUES(1,'Bus Cama'),(2,'Prime')");
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,1,true),(2,2,true)");
        insertarViaje(4, 1, 1, "2026-10-01");
        insertarViaje(5, 1, 1, "2026-10-19");
        insertarViaje(6, 2, 2, "2026-10-21");
        insertarViaje(7, 3, 1, "2026-10-22");
        // Viaje 4 (ya salió): 3 asientos, 2 ocupados → 67 % de ocupación.
        insertarAsiento(1, 4, "OCUPADO");
        insertarAsiento(2, 4, "DISPONIBLE");
        insertarAsiento(3, 4, "OCUPADO");
        insertarAsiento(4, 5, "OCUPADO");
        insertarAsiento(5, 5, "OCUPADO");
        insertarAsiento(6, 6, "OCUPADO");
        insertarAsiento(7, 6, "OCUPADO");
        insertarAsiento(8, 6, "OCUPADO");
        insertarAsiento(9, 7, "OCUPADO");
        jdbc.update("INSERT INTO pasajero(tipo_documento,numero_documento,nombres,apellidos) VALUES('DNI','11111111','ANA','LOPEZ')");
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo) VALUES('Prueba')");
        idUsuario = crearUsuario("cliente");

        // Ventas válidas del período actual (PRODUCTION, pagadas y aprobadas).
        insertarVenta("2026-10-10T08:00", "PRODUCTION", "PAGADA", "APROBADO", 1, "40.00");
        insertarVenta("2026-10-11T12:00", "PRODUCTION", "PAGADA", "APROBADO", 4, "50.00");
        insertarVenta("2026-10-12T09:30", "PRODUCTION", "PAGADA", "APROBADO", 6, "60.00");
        insertarVenta("2026-10-09T10:00", "PRODUCTION", "PAGADA", "APROBADO", 9, "20.00");
        // Venta válida del período anterior.
        insertarVenta("2026-10-05T18:00", "PRODUCTION", "PAGADA", "APROBADO", 3, "30.00");
        // No cuentan en PRODUCTION: venta de prueba, venta sin pagar y venta reembolsada.
        insertarVenta("2026-10-11T10:00", "SANDBOX", "PAGADA", "APROBADO", 5, "99.00");
        insertarVenta("2026-10-11T11:00", "PRODUCTION", "PENDIENTE", "PENDIENTE", 7, "70.00");
        int reembolsada = insertarVenta("2026-10-11T13:00", "PRODUCTION", "PAGADA", "APROBADO", 8, "80.00");
        jdbc.update("INSERT INTO operacion_pago(referencia_externa,clave_idempotencia,id_viaje,id_sesion_reserva,"
                + "id_usuario,medio_pago,monto,estado,id_venta,fecha_expiracion) "
                + "VALUES('REF-1','IDEM-1',6,'SES-1',?,'TARJETA',80,'REEMBOLSADO',?,CURRENT_TIMESTAMP)",
                idUsuario, reembolsada);
    }

    DashboardDto consultar(String entorno, Long agencia, Long servicioBus, String destino) {
        return servicio.obtener(DESDE, HASTA, entorno, agencia, servicioBus, destino);
    }

    static BigDecimal total(PeriodoDto periodo) {
        return periodo.ventas().stream().map(VentaDto::ingreso).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Test
    void cuentaSoloVentasPagadasNoReembolsadasDelEntornoPedido() {
        DashboardDto datos = consultar(null, null, null, null);

        assertEquals(4, datos.actual().ventas().size());
        assertEquals(0, new BigDecimal("170.00").compareTo(total(datos.actual())));
        assertEquals("emitido", datos.actual().ventas().get(0).estado());

        DashboardDto prueba = consultar("sandbox", null, null, null);
        assertEquals(1, prueba.actual().ventas().size());
        assertEquals(0, new BigDecimal("99.00").compareTo(total(prueba.actual())));
    }

    @Test
    void comparaConElPeriodoAnteriorDeIgualDuracion() {
        DashboardDto datos = consultar(null, null, null, null);

        assertEquals(LocalDate.of(2026, 10, 3), datos.anterior().rango().desde());
        assertEquals(LocalDate.of(2026, 10, 7), datos.anterior().rango().hasta());
        assertEquals(1, datos.anterior().ventas().size());
        assertEquals(0, new BigDecimal("30.00").compareTo(total(datos.anterior())));
    }

    @Test
    void cadaVentaTraeSuViajeAgenciaDeSalidaServicioYCiudades() {
        VentaDto venta = consultar(null, null, null, null).actual().ventas().get(1);

        assertEquals("4", venta.viajeId());
        assertEquals(LocalDate.of(2026, 10, 10), venta.fecha());
        assertEquals("1", venta.agenciaId());
        assertEquals("1", venta.servicioId());
        assertEquals("Lima", venta.origen());
        assertEquals("Cusco", venta.destino());
    }

    @Test
    void filtraPorAgenciaDeSalidaServicioYDestino() {
        // La agencia 1 representa a Lima: incluye también la venta de la agencia duplicada 4.
        assertEquals(3, consultar(null, 1L, null, null).actual().ventas().size());
        assertEquals(1, consultar(null, 2L, null, null).actual().ventas().size());
        assertEquals(1, consultar(null, null, 2L, null).actual().ventas().size());
        assertEquals(2, consultar(null, null, null, "arequipa").actual().ventas().size());
        assertEquals(0, consultar(null, 2L, 1L, null).actual().ventas().size());
    }

    @Test
    void lasAgenciasDuplicadasDeUnaCiudadSeUnen() {
        VentaDto deLaDuplicada = consultar(null, null, null, null).actual().ventas().get(0);

        assertEquals("7", deLaDuplicada.viajeId());
        assertEquals("1", deLaDuplicada.agenciaId());
    }

    @Test
    void laOcupacionSoloIncluyeViajesQueYaSalieron() {
        List<OcupacionViajeDto> viajes = consultar(null, null, null, null).actual().viajes();

        assertEquals(List.of(new OcupacionViajeDto("4", 3, 2)), viajes);
    }

    @Test
    void ofreceLasOpcionesDeLosFiltrosYLaFechaDeHoy() {
        OpcionesDashboardDto opciones = servicio.opciones();

        assertEquals(List.of("Agencia Arequipa", "Agencia Cusco", "Agencia Lima"),
                opciones.agencias().stream().map(OpcionDto::nombre).toList());
        assertEquals(List.of("Bus Cama", "Prime"), opciones.servicios().stream().map(OpcionDto::nombre).toList());
        assertEquals(List.of("Arequipa", "Cusco"), opciones.destinos());
        assertEquals(LocalDate.of(2026, 10, 12), opciones.hoy());
    }

    @Test
    void rechazaFiltrosNoValidos() {
        assertEquals(400, codigoDeError(() -> servicio.obtener(null, HASTA, null, null, null, null)));
        assertEquals(400, codigoDeError(() -> servicio.obtener("2026-10-20", HASTA, null, null, null, null)));
        assertEquals(400, codigoDeError(() -> servicio.obtener("ayer", HASTA, null, null, null, null)));
        assertEquals(400, codigoDeError(() -> servicio.obtener("2025-01-01", HASTA, null, null, null, null)));
        assertEquals(400, codigoDeError(() -> servicio.obtener(DESDE, HASTA, "OTRO", null, null, null)));
    }

    @Test
    void soloElGerentePuedeVerElDashboard() throws Exception {
        assertEquals(401, pedir("/api/dashboard?desde=" + DESDE + "&hasta=" + HASTA, null).statusCode());
        assertEquals(403, pedir("/api/dashboard/opciones", tokenDe("AGENCIA")).statusCode());

        HttpResponse<String> respuesta = pedir("/api/dashboard?desde=" + DESDE + "&hasta=" + HASTA, tokenDe("GERENTE"));
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        assertEquals(4, json.readTree(respuesta.body()).get("actual").get("ventas").size());
        assertEquals("2026-10-09", json.readTree(respuesta.body()).get("actual").get("ventas").get(0).get("fecha").asText());
    }

    // ---------- Ayudantes ----------

    static int codigoDeError(Runnable accion) {
        return assertThrows(ResponseStatusException.class, accion::run).getStatusCode().value();
    }

    void insertarViaje(int id, int programacion, int bus, String fecha) {
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(?,?,?,DATE '" + fecha + "',CAST('08:00:00' AS TIME),'PROGRAMADO')", id, programacion, bus);
    }

    void insertarAsiento(int id, int viaje, String estado) {
        jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento) VALUES(?,?,50,?)",
                id, viaje, estado);
    }

    /** Crea una venta con su pago y un pasaje en el asiento indicado; devuelve el id de la venta. */
    int insertarVenta(String fechaHora, String entorno, String estadoVenta, String estadoPago, int idViajeAsiento,
            String precio) {
        jdbc.update("INSERT INTO venta(fecha_venta,monto_total,estado_venta,entorno) VALUES(?,?,?,?)",
                LocalDateTime.parse(fechaHora), new BigDecimal(precio), estadoVenta, entorno);
        int venta = jdbc.queryForObject("SELECT MAX(id_venta) FROM venta", Integer.class);
        int metodo = jdbc.queryForObject("SELECT MIN(id_metodo_pago) FROM metodo_pago", Integer.class);
        int pasajero = jdbc.queryForObject("SELECT MIN(id_pasajero) FROM pasajero", Integer.class);
        jdbc.update("INSERT INTO pago(id_venta,id_metodo_pago,monto,estado_pago) VALUES(?,?,?,?)",
                venta, metodo, new BigDecimal(precio), estadoPago);
        jdbc.update("INSERT INTO pasaje(id_venta,id_pasajero,id_viaje_asiento,precio) VALUES(?,?,?,?)",
                venta, pasajero, idViajeAsiento, new BigDecimal(precio));
        return venta;
    }

    int crearUsuario(String prefijo) {
        String correo = prefijo + "-" + UUID.randomUUID() + "@example.com";
        jdbc.update("INSERT INTO usuario(nombres,apellidos,correo,contrasena_hash) VALUES('Prueba','Dashboard',?,?)",
                correo, encoder.encode(CLAVE));
        return jdbc.queryForObject("SELECT id_usuario FROM usuario WHERE correo = ?", Integer.class, correo);
    }

    /** Crea un empleado con el rol indicado, inicia sesión en el Sistema Empresarial y devuelve su JWT. */
    String tokenDe(String rol) throws Exception {
        int id = crearUsuario(rol.toLowerCase());
        jdbc.update("INSERT INTO empleado(id_usuario,rol,id_agencia) VALUES(?,?,?)", id, rol,
                rol.equals("AGENCIA") ? 1L : null);
        String correo = jdbc.queryForObject("SELECT correo FROM usuario WHERE id_usuario = ?", String.class, id);
        String cuerpo = json.writeValueAsString(Map.of("correo", correo, "contrasena", CLAVE));
        HttpResponse<String> login = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login-empresarial"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(200, login.statusCode(), login.body());
        return json.readTree(login.body()).get("token").asText();
    }

    HttpResponse<String> pedir(String ruta, String token) throws Exception {
        HttpRequest.Builder peticion = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta)).GET();
        if (token != null) {
            peticion.header("Authorization", "Bearer " + token);
        }
        return http.send(peticion.build(), HttpResponse.BodyHandlers.ofString());
    }
}
