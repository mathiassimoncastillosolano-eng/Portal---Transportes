package com.transportes.postergacion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
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
import com.transportes.pagos.entidades.OperacionPago;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.servicios.ConfirmacionPostergacionServicio;
import com.transportes.viajes.servicios.TokenSesionServicio;

import tools.jackson.databind.ObjectMapper;

/**
 * HU-02 · Confirmación (criterios 8 a 11) de punta a punta: JWT real → controlador → transacción → SQL en H2.
 * Lo importante: o se aplica TODO (viaje, asiento, historial) o no cambia NADA.
 */
@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:confirmacionpostergacion;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,classpath:schema-compras-test.sql"
})
class PostergacionConfirmacionIntegracionTest {

    static final String CLAVE = "ClavePostergacion2026!";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired RelojPrueba reloj;
    @Autowired TokenSesionServicio tokens;
    @Autowired ConfirmacionPostergacionServicio confirmacion;
    final HttpClient http = HttpClient.newHttpClient();

    // Viaje original 5 (19/10 08:00) con el asiento 1 (12A). Viaje nuevo 6 (21/10 08:00) con el asiento 4 (20B).
    int pasaje;        // del usuario A: asiento 1 del viaje 5, pagó 43.00
    int pasajeAjeno;   // del usuario B
    int venta;
    String jwtA;
    String jwtB;
    TokenSesionServicio.SesionReserva sesion; // sesión de reserva del viaje 6, dueña del bloqueo del asiento 4

    @BeforeEach
    void preparar() throws Exception {
        // Hoy es 12/10/2026 a las 10:00 (hora de Perú).
        reloj.fijar(LocalDateTime.of(2026, 10, 12, 10, 0));
        for (String tabla : List.of("postergacion", "comprobante", "pasaje", "pago", "operacion_pago", "venta",
                "viaje_asiento", "pasajero", "asiento", "viaje", "bus", "programacion_viaje", "ruta", "agencia",
                "tipo_bus", "ubicacion")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO ubicacion(id_ubicacion,nombre,activa) OVERRIDING SYSTEM VALUE VALUES(1,'Lima',true),(2,'Cusco',true)");
        jdbc.update("INSERT INTO agencia(id_agencia,id_ubicacion,activa) VALUES(1,1,true),(2,2,true)");
        jdbc.update("INSERT INTO ruta(id_ruta,id_agencia_origen,id_agencia_destino,activa) VALUES(1,1,2,true)");
        jdbc.update("INSERT INTO programacion_viaje(id_programacion,id_ruta,activa) VALUES(1,1,true)");
        jdbc.update("INSERT INTO tipo_bus(id_tipo_bus,nombre_tipo) OVERRIDING SYSTEM VALUE VALUES(1,'Bus Cama')");
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,1,true)");
        insertarViaje(5, "2026-10-19", "PROGRAMADO");
        insertarViaje(6, "2026-10-21", "PROGRAMADO");
        insertarAsiento(1, "12A", 5, "43.00", "OCUPADO", null);   // el del pasaje de A
        insertarAsiento(3, "13A", 5, "43.00", "OCUPADO", null);   // el del pasaje de B
        jdbc.update("INSERT INTO pasajero(id_pasajero,tipo_documento,numero_documento,nombres,apellidos) OVERRIDING SYSTEM VALUE "
                + "VALUES(1,'DNI','11111111','ANA','LOPEZ'),(2,'DNI','22222222','OTRA','PERSONA')");

        jwtA = jwtUsuario("a");
        jwtB = jwtUsuario("b");
        venta = insertarVenta(idUsuario("a"));
        pasaje = insertarPasaje(venta, 1, 1);
        pasajeAjeno = insertarPasaje(insertarVenta(idUsuario("b")), 2, 3);

        // El cliente ya eligió el asiento 4 del viaje 6: está BLOQUEADO por su sesión de reserva.
        sesion = tokens.crear(6L);
        insertarAsiento(4, "20B", 6, "43.00", "BLOQUEADO_TEMPORAL", sesion.idSesion());
    }

    // ---------- criterio 8 y 10: se aplica todo junto ----------

    @Test
    void confirmaElCambioEnUnaSolaOperacionYGuardaElHistorial() throws Exception {
        var r = confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(200, r.statusCode(), r.body());

        // Criterio 11: informa nuevo viaje, fecha, horario y asiento.
        var datos = json.readTree(r.body());
        assertEquals("true", datos.get("aceptada").asText());
        assertEquals("6", datos.get("idViajeNuevo").asText());
        assertEquals("2026-10-21", datos.get("fechaSalida").asText());
        assertTrue(datos.get("horaSalida").asText().startsWith("08:00"), r.body());
        assertEquals("20B", datos.get("asientoNuevo").asText());
        assertEquals("12A", datos.get("asientoAnterior").asText());

        // Viaje y asiento cambiaron juntos: el nuevo OCUPADO, el original DISPONIBLE.
        assertEquals(4, idAsientoDelPasaje(pasaje));
        assertEquals("OCUPADO", estadoAsiento(4));
        assertEquals("DISPONIBLE", estadoAsiento(1));
        assertNull(jdbc.queryForObject("SELECT token_bloqueo FROM viaje_asiento WHERE id_viaje_asiento = 1", String.class));

        // Criterio 10: mismo pasaje y misma venta, un solo pago en la venta, historial con viaje anterior y nuevo.
        assertEquals(venta, jdbc.queryForObject("SELECT id_venta FROM pasaje WHERE id_pasaje = ?", Integer.class, pasaje));
        assertEquals(2, contar("SELECT COUNT(*) FROM pasaje"), "siguen los 2 pasajes de la preparación (A y B): no se creó otro");
        assertEquals(2, contar("SELECT COUNT(*) FROM venta"));
        assertEquals(1, contar("SELECT COUNT(*) FROM pago WHERE id_venta = " + venta));
        var fila = jdbc.queryForMap("SELECT * FROM postergacion WHERE id_pasaje = " + pasaje);
        assertEquals(5L, ((Number) fila.get("id_viaje_anterior")).longValue());
        assertEquals(6L, ((Number) fila.get("id_viaje_nuevo")).longValue());
        assertEquals(1, ((Number) fila.get("id_viaje_asiento_anterior")).intValue());
        assertEquals(4, ((Number) fila.get("id_viaje_asiento_nuevo")).intValue());
        assertEquals(0, new BigDecimal("0.00").compareTo((BigDecimal) fila.get("importe_adicional")));
    }

    @Test
    void laDiferenciaPagadaQuedaComoPagoAdicionalEnElHistorial() throws Exception {
        jdbc.update("UPDATE viaje_asiento SET precio = 60.00 WHERE id_viaje_asiento = 4"); // 17.00 más caro
        pagarCambio(6, 4, "17.00", "SIM-ABC123", sesion.idSesion());
        var fila = jdbc.queryForMap("SELECT * FROM postergacion WHERE id_pasaje = " + pasaje);
        assertEquals(0, new BigDecimal("17.00").compareTo((BigDecimal) fila.get("importe_adicional")));
        assertEquals("SIM-ABC123", fila.get("referencia_pago"));
        assertEquals(1, contar("SELECT COUNT(*) FROM pago WHERE id_venta = " + venta), "el pago original no se toca");
    }

    // ---------- varias postergaciones del mismo pasaje ----------

    /** Primera postergación: viaje 5 -> 6, asiento de 60.00, paga 17.00. Deja el pasaje en el viaje 6 con 60.00 pagado. */
    private void postergarPrimeraVez() throws Exception {
        jdbc.update("UPDATE viaje_asiento SET precio = 60.00 WHERE id_viaje_asiento = 4");
        pagarCambio(6, 4, "17.00", "SIM-PRIMERA", sesion.idSesion());
    }

    private void pagarCambio(int idViaje, int idAsiento, String monto, String referencia, String idSesion) {
        OperacionPago operacion = new OperacionPago();
        operacion.setIdPasaje(pasaje);
        operacion.setIdUsuario(idUsuario("a"));
        operacion.setIdViaje((long) idViaje);
        operacion.setIdAsientoNuevo(idAsiento);
        operacion.setIdSesionReserva(idSesion);
        operacion.setMonto(new BigDecimal(monto));
        operacion.setReferenciaExterna(referencia);
        confirmacion.aplicarCambioPagado(operacion);
    }

    /** Prepara el viaje 7 con el asiento 5 (precio dado), bloqueado por una sesión de reserva nueva. */
    private TokenSesionServicio.SesionReserva prepararSegundoDestino(String precioAsiento) {
        insertarViaje(7, "2026-10-23", "PROGRAMADO");
        var sesion7 = tokens.crear(7L);
        insertarAsiento(5, "30C", 7, precioAsiento, "BLOQUEADO_TEMPORAL", sesion7.idSesion());
        return sesion7;
    }

    @Test
    void laSegundaPostergacionSeCalculaSobreLoYaPagadoYSeRegistraOtraFila() throws Exception {
        postergarPrimeraVez();
        var sesion7 = prepararSegundoDestino("70.00");

        // 70.00 - (43.00 + 17.00) = 10.00 (con el cálculo anterior serían 27.00).
        pagarCambio(7, 5, "10.00", "SIM-SEGUNDA", sesion7.idSesion());

        assertEquals(5, idAsientoDelPasaje(pasaje));
        assertEquals("DISPONIBLE", estadoAsiento(4), "el asiento de la primera postergación vuelve a quedar libre");
        assertEquals(2, contar("SELECT COUNT(*) FROM postergacion WHERE id_pasaje = " + pasaje), "una fila por postergación");
        assertEquals(0, new BigDecimal("27.00").compareTo(jdbc.queryForObject(
                "SELECT SUM(importe_adicional) FROM postergacion WHERE id_pasaje = ?", BigDecimal.class, pasaje)));
    }

    @Test
    void laSegundaPostergacionRechazaUnPagoMenorAlaDiferenciaRealYNoCambiaNada() throws Exception {
        postergarPrimeraVez();
        var sesion7 = prepararSegundoDestino("70.00");

        var e = assertThrows(PostergacionRechazadaException.class,
                () -> pagarCambio(7, 5, "9.99", "SIM-SEGUNDA", sesion7.idSesion()));

        assertEquals(PostergacionRechazadaException.PAGO_INSUFICIENTE, e.getCodigo());
        assertEquals(4, idAsientoDelPasaje(pasaje), "sigue en el asiento de la primera postergación");
        assertEquals("BLOQUEADO_TEMPORAL", estadoAsiento(5));
        assertEquals(1, contar("SELECT COUNT(*) FROM postergacion WHERE id_pasaje = " + pasaje));
    }

    @Test
    void elListadoDeComprasExponeLoPagadoEnPostergacionesYNoCambiaElPrecioNiElTotal() throws Exception {
        var antes = json.readTree(listarPasajes(jwtA).body()).get("compras").get(0).get("boletos").get(0);
        assertEquals(0, new BigDecimal("0").compareTo(antes.get("adicionalPagado").decimalValue()));

        postergarPrimeraVez();
        var sesion7 = prepararSegundoDestino("70.00");
        pagarCambio(7, 5, "10.00", "SIM-SEGUNDA", sesion7.idSesion());

        var compra = json.readTree(listarPasajes(jwtA).body()).get("compras").get(0);
        var boleto = compra.get("boletos").get(0);
        assertEquals(0, new BigDecimal("43.00").compareTo(boleto.get("precio").decimalValue()), "el precio original no cambia");
        assertEquals(0, new BigDecimal("27.00").compareTo(boleto.get("adicionalPagado").decimalValue()), "17.00 + 10.00");
        assertTrue(compra.get("totalConsistente").asBoolean(), "el total de la venta sigue cuadrando");
        assertEquals(1, compra.get("boletos").size(), "la suma no duplica filas del pasaje");
    }

    // ---------- criterio 9: rechazo y conservación ----------

    @Test
    void siElAsientoNuevoYaNoEstaDisponibleSeRechazaYElPasajeNoCambia() throws Exception {
        // Otra persona (otra sesión) quedó con el asiento antes de confirmar.
        jdbc.update("UPDATE viaje_asiento SET token_bloqueo = 'sesion-de-otra-persona' WHERE id_viaje_asiento = 4");
        var r = confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("ASIENTO_NO_DISPONIBLE", codigo(r));
        assertEquals("El asiento que elegiste dejó de estar disponible. Tu pasaje original no fue modificado.", mensaje(r));
        assertPasajeSinCambios();
    }

    @Test
    void siElAsientoNuevoYaFueVendidoSeRechazaYElPasajeNoCambia() throws Exception {
        jdbc.update("UPDATE viaje_asiento SET estado_viaje_asiento = 'OCUPADO' WHERE id_viaje_asiento = 4");
        var r = confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("ASIENTO_NO_DISPONIBLE", codigo(r));
        assertEquals(1, idAsientoDelPasaje(pasaje));
        assertEquals("OCUPADO", estadoAsiento(1));
        assertEquals(0, contar("SELECT COUNT(*) FROM postergacion"));
    }

    @Test
    void unaSesionQueNoEsDeEsteViajeSeRechazaYElPasajeNoCambia() throws Exception {
        var otraSesion = tokens.crear(5L); // token de otro viaje
        var r = confirmar(pasaje, jwtA, Map.of("idViajeNuevo", 6, "idAsiento", 4,
                "tokenSesion", otraSesion.tokenSesion(), "montoAdicional", "0.00"));
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("SESION_VENCIDA", codigo(r));
        assertPasajeSinCambios();
    }

    @Test
    void siLaOperacionFallaAMitadDeCaminoSeRevierteTodo() throws Exception {
        // El asiento original NO está OCUPADO (dato inconsistente): el servicio ya ocupó el asiento nuevo y movió el
        // pasaje cuando falla al liberar el original. La transacción completa debe revertirse.
        jdbc.update("UPDATE viaje_asiento SET estado_viaje_asiento = 'DISPONIBLE' WHERE id_viaje_asiento = 1");
        var r = confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("CAMBIO_NO_APLICADO", codigo(r));

        assertEquals(1, idAsientoDelPasaje(pasaje), "el pasaje conserva su asiento");
        assertEquals("BLOQUEADO_TEMPORAL", estadoAsiento(4), "el asiento nuevo no quedó ocupado");
        assertEquals(sesion.idSesion(), jdbc.queryForObject(
                "SELECT token_bloqueo FROM viaje_asiento WHERE id_viaje_asiento = 4", String.class));
        assertEquals(0, contar("SELECT COUNT(*) FROM postergacion"), "no quedó historial");
    }

    @Test
    void unPagoQueNoCubreLaDiferenciaSeRechazaYElPasajeNoCambia() throws Exception {
        jdbc.update("UPDATE viaje_asiento SET precio = 60.00 WHERE id_viaje_asiento = 4");
        var r = confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("PAGO_INSUFICIENTE", codigo(r));
        assertPasajeSinCambios();
    }

    @Test
    void faltandoMenosDe6HorasSeRechazaConElMotivo() throws Exception {
        // El viaje original sale el 19/10 a las 08:00; a las 02:01 faltan 5 h 59 min.
        reloj.fijar(LocalDateTime.of(2026, 10, 19, 2, 1));
        var r = confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(409, r.statusCode(), r.body());
        assertEquals("Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.", mensaje(r));
        assertEquals("ANTICIPACION_INSUFICIENTE", codigo(r));
        assertPasajeSinCambios();
    }

    @Test
    void noSePuedeConfirmarDosVecesElMismoCambio() throws Exception {
        assertEquals(200, confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null)).statusCode());
        var segunda = confirmar(pasaje, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(409, segunda.statusCode(), segunda.body());
        assertEquals(4, idAsientoDelPasaje(pasaje));
        assertEquals(1, contar("SELECT COUNT(*) FROM postergacion"));
    }

    // ---------- seguridad ----------

    @Test
    void sinSesionNoSePuedeConfirmar() throws Exception {
        assertEquals(401, confirmar(pasaje, null, cuerpo(6, 4, "0.00", null)).statusCode());
    }

    @Test
    void unPasajeAjenoRespondeComoSiNoExistiera() throws Exception {
        var ajeno = confirmar(pasajeAjeno, jwtA, cuerpo(6, 4, "0.00", null));
        var inexistente = confirmar(999999, jwtA, cuerpo(6, 4, "0.00", null));
        assertEquals(404, ajeno.statusCode(), ajeno.body());
        assertEquals(404, inexistente.statusCode());
        assertEquals(mensaje(inexistente), mensaje(ajeno));
        assertEquals(0, contar("SELECT COUNT(*) FROM postergacion"));
        assertEquals("BLOQUEADO_TEMPORAL", estadoAsiento(4));
    }

    @Test
    void unaSolicitudIncompletaSeRechazaConError400() throws Exception {
        var r = confirmar(pasaje, jwtA, Map.of("idViajeNuevo", 6));
        assertEquals(400, r.statusCode(), r.body());
        assertPasajeSinCambios();
    }

    // ---------- comprobaciones ----------

    /** El pasaje conserva viaje, asiento y estado; el asiento nuevo sigue reservado por la sesión; sin historial. */
    void assertPasajeSinCambios() {
        assertEquals(1, idAsientoDelPasaje(pasaje));
        assertEquals("OCUPADO", estadoAsiento(1));
        assertEquals("BLOQUEADO_TEMPORAL", estadoAsiento(4));
        assertEquals("PAGADA", jdbc.queryForObject("SELECT estado_venta FROM venta WHERE id_venta = ?", String.class, venta));
        assertEquals(0, contar("SELECT COUNT(*) FROM postergacion"));
    }

    int idAsientoDelPasaje(int idPasaje) {
        return jdbc.queryForObject("SELECT id_viaje_asiento FROM pasaje WHERE id_pasaje = ?", Integer.class, idPasaje);
    }

    String estadoAsiento(int idViajeAsiento) {
        return jdbc.queryForObject("SELECT estado_viaje_asiento FROM viaje_asiento WHERE id_viaje_asiento = ?",
                String.class, idViajeAsiento);
    }

    int contar(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }

    // ---------- datos de prueba ----------

    Map<String, Object> cuerpo(int idViaje, int idAsiento, String monto, String referencia) {
        Map<String, Object> m = new HashMap<>();
        m.put("idViajeNuevo", idViaje);
        m.put("idAsiento", idAsiento);
        m.put("tokenSesion", sesion.tokenSesion());
        m.put("montoAdicional", monto);
        if (referencia != null) m.put("referenciaPago", referencia);
        return m;
    }

    String mensaje(HttpResponse<String> respuesta) throws Exception {
        return json.readTree(respuesta.body()).get("mensaje").asText();
    }

    String codigo(HttpResponse<String> respuesta) throws Exception {
        return json.readTree(respuesta.body()).get("detalles").get(0).asText();
    }

    void insertarViaje(int id, String fecha, String estado) {
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(?,1,1,DATE '" + fecha + "',CAST('08:00:00' AS TIME),?)", id, estado);
    }

    void insertarAsiento(int id, String numero, int viaje, String precio, String estado, String token) {
        jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", id, numero);
        jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento,"
                + "token_bloqueo,fecha_expiracion_bloqueo) VALUES(?,?,?,?,?,?,?)",
                id, viaje, new BigDecimal(precio), estado, id, token,
                token == null ? null : LocalDateTime.now().plusMinutes(10));
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

    HttpResponse<String> confirmar(int idPasaje, String jwt, Object cuerpo) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port
                        + "/api/usuarios/postergaciones/" + idPasaje + "/confirmar"))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo)));
        if (jwt != null) b.header("Authorization", "Bearer " + jwt);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> listarPasajes(String jwt) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/usuarios/perfil/pasajes"))
                .timeout(Duration.ofSeconds(20)).header("Authorization", "Bearer " + jwt).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> post(String ruta, Object cuerpo) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo))).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    String correo(String alias) {
        return "confirmacion-" + alias + "@example.com";
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
