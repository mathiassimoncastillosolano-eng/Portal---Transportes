package com.transportes.viajes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.transportes.viajes.servicios.ClienteDni;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Flujo de reserva contra H2: bloqueo de asientos, consulta de DNI, "Continuar al pago" (datos en caché,
 * sin tocar la BD) y confirmación del pago simulado (pasajeros + asientos a la BD en una transacción).
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:reserva;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql",
    "reserva.token-secreto=secreto-de-pruebas-de-reserva-solo-local-0123456789",
    "reserva.confirmacion-demo=true"
})
class PagoReservaIntegracionTest {

    static final long VIAJE = 1L;
    static final String CLAVE = "ClaveReserva2026!";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @MockitoBean ClienteDni clienteDni;
    final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void preparar() {
        for (String tabla : List.of("viaje_asiento", "pasajero", "asiento", "viaje", "bus")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,NULL,true)");
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(1,NULL,1,DATE '2030-01-01',CAST('08:00:00' AS TIME),'PROGRAMADO')");
        for (int i = 1; i <= 3; i++) {
            jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", i, i + "A");
            jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento) "
                    + "VALUES(?,1,50,'DISPONIBLE',?)", i, i);
        }
        jdbc.update("INSERT INTO pasajero(tipo_documento,numero_documento,nombres,apellidos,fecha_nacimiento,nro_telefono) "
                + "VALUES('DNI','11111111','ANA','LOPEZ',DATE '1990-01-01','911111111')");
        when(clienteDni.consultar(anyString())).thenReturn(Optional.empty());
    }

    // ---------- utilidades ----------

    HttpResponse<String> enviar(String metodo, String ruta, Object cuerpo, String jwt) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json");
        if (jwt != null) b.header("Authorization", "Bearer " + jwt);
        b.method(metodo, cuerpo == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo)));
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    String jwtUsuario() throws Exception {
        String correo = "reserva-" + UUID.randomUUID() + "@example.com";
        var registro = enviar("POST", "/api/usuarios/registro",
                Map.of("nombres", "Lucas", "apellidos", "Prueba", "correo", correo, "contrasena", CLAVE), null);
        assertEquals(201, registro.statusCode(), registro.body());
        var login = enviar("POST", "/api/auth/login", Map.of("correo", correo, "contrasena", CLAVE), null);
        return json.readTree(login.body()).get("token").asText();
    }

    /** Crea una sesión y bloquea los asientos indicados; devuelve el tokenSesion. */
    String sesionConAsientos(int... asientos) throws Exception {
        var sesion = enviar("POST", "/api/viajes/" + VIAJE + "/sesiones", null, null);
        assertEquals(201, sesion.statusCode(), sesion.body());
        String token = json.readTree(sesion.body()).get("tokenSesion").asText();
        for (int asiento : asientos) {
            var r = enviar("POST", "/api/viajes/" + VIAJE + "/asientos/" + asiento + "/bloquear",
                    Map.of("tokenSesion", token), null);
            assertEquals(200, r.statusCode(), r.body());
        }
        return token;
    }

    Map<String, Object> pasajero(int idAsiento, String dni, String nombres, String apellidos, String celular) {
        return Map.of("idAsiento", idAsiento, "tipoDocumento", "DNI", "numeroDocumento", dni,
                "nombres", nombres, "apellidos", apellidos, "fechaNacimiento", "1995-05-05", "nroTelefono", celular);
    }

    /** "Continuar al pago": valida y deja los datos en la caché. */
    JsonNode continuar(String token, List<Map<String, Object>> pasajeros) throws Exception {
        var r = enviar("POST", "/api/viajes/" + VIAJE + "/pasajeros",
                Map.of("tokenSesion", token, "pasajeros", pasajeros), null);
        assertEquals(200, r.statusCode(), r.body());
        return json.readTree(r.body());
    }

    HttpResponse<String> confirmar(String token) throws Exception {
        return enviar("POST", "/api/viajes/" + VIAJE + "/confirmar-demo", Map.of("tokenSesion", token), null);
    }

    List<Map<String, Object>> dosPasajeros() {
        List<Map<String, Object>> lista = new ArrayList<>();
        // El existente llega con otros nombres a propósito: la BD manda y solo cambia el celular.
        lista.add(pasajero(1, "11111111", "OTRO", "NOMBRE", "922222222"));
        lista.add(pasajero(2, "22222222", "Carlos", "Quispe Rojas", "933333333"));
        return lista;
    }

    int cuenta(String sql, Object... args) {
        return jdbc.queryForObject(sql, Integer.class, args);
    }

    void assertNadaPersistido() {
        assertEquals(1, cuenta("SELECT COUNT(*) FROM pasajero"), "no debe crearse ningún pasajero");
        assertEquals("911111111", jdbc.queryForObject(
                "SELECT nro_telefono FROM pasajero WHERE numero_documento='11111111'", String.class));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='OCUPADO'"));
        assertEquals(0, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE id_pasajero IS NOT NULL"));
    }

    // ---------- consulta de DNI ----------

    @Test
    void consultaDniExigeJwtYNoCreaPasajeros() throws Exception {
        assertEquals(401, enviar("GET", "/api/pasajeros/dni/11111111", null, null).statusCode());
        String jwt = jwtUsuario();

        JsonNode existente = json.readTree(enviar("GET", "/api/pasajeros/dni/11111111", null, jwt).body());
        assertTrue(existente.get("existente").asBoolean());
        assertEquals("BD", existente.get("origen").asText());
        assertEquals("ANA", existente.get("nombres").asText());
        assertEquals("LOPEZ", existente.get("apellidos").asText());
        assertEquals("1990-01-01", existente.get("fechaNacimiento").asText());
        assertEquals("911111111", existente.get("nroTelefono").asText());

        when(clienteDni.consultar("33333333")).thenReturn(Optional.of(new ClienteDni.DatosDni("LUIS", "PEREZ GARCIA")));
        JsonNode externo = json.readTree(enviar("GET", "/api/pasajeros/dni/33333333", null, jwt).body());
        assertFalse(externo.get("existente").asBoolean());
        assertEquals("APIPERU", externo.get("origen").asText());
        assertEquals("LUIS", externo.get("nombres").asText());
        assertTrue(externo.get("fechaNacimiento").isNull());

        JsonNode manual = json.readTree(enviar("GET", "/api/pasajeros/dni/44444444", null, jwt).body());
        assertEquals("MANUAL", manual.get("origen").asText());
        assertEquals(400, enviar("GET", "/api/pasajeros/dni/123", null, jwt).statusCode());

        assertEquals(1, cuenta("SELECT COUNT(*) FROM pasajero"), "consultar no debe persistir nada");
    }

    // ---------- continuar al pago + confirmación ----------

    @Test
    void continuarAlPagoNoPersisteYLaConfirmacionGuardaTodo() throws Exception {
        String token = sesionConAsientos(1, 2);
        assertTrue(continuar(token, dosPasajeros()).get("valido").asBoolean());
        assertNadaPersistido(); // solo hay caché: ni pasajeros ni asientos ocupados
        assertEquals(2, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='BLOQUEADO_TEMPORAL'"));

        var r = confirmar(token);
        assertEquals(200, r.statusCode(), r.body());
        assertEquals(2, json.readTree(r.body()).size());

        assertEquals(2, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='OCUPADO' AND id_pasajero IS NOT NULL"));
        assertEquals(1, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='DISPONIBLE'"));
        assertEquals(2, cuenta("SELECT COUNT(*) FROM pasajero"));

        // Existente: nombres intactos, celular actualizado.
        var ana = jdbc.queryForMap("SELECT nombres, apellidos, nro_telefono FROM pasajero WHERE numero_documento='11111111'");
        assertEquals("ANA", ana.get("nombres"));
        assertEquals("LOPEZ", ana.get("apellidos"));
        assertEquals("922222222", ana.get("nro_telefono"));
        // Nuevo: creado con el celular en nro_telefono.
        var carlos = jdbc.queryForMap("SELECT nombres, apellidos, nro_telefono FROM pasajero WHERE numero_documento='22222222'");
        assertEquals("Carlos", carlos.get("nombres"));
        assertEquals("933333333", carlos.get("nro_telefono"));

        // Doble confirmación: la caché ya se vació y no hay asientos bloqueados.
        assertEquals(409, confirmar(token).statusCode());
        assertEquals(2, cuenta("SELECT COUNT(*) FROM pasajero"));
    }

    @Test
    void sinContinuarAlPagoNoSePuedeConfirmar() throws Exception {
        String token = sesionConAsientos(1, 2);
        assertEquals(409, confirmar(token).statusCode());
        assertNadaPersistido();
        assertEquals(2, cuenta("SELECT COUNT(*) FROM viaje_asiento WHERE estado_viaje_asiento='BLOQUEADO_TEMPORAL'"));
    }

    @Test
    void volverAContinuarReemplazaLosDatosYLosInvalidosLosDescartan() throws Exception {
        String token = sesionConAsientos(1, 2);
        continuar(token, dosPasajeros());
        var corregidos = dosPasajeros();
        corregidos.set(1, pasajero(2, "22222222", "Carlos", "Quispe Rojas", "944444444"));
        continuar(token, corregidos);
        assertEquals(200, confirmar(token).statusCode());
        assertEquals("944444444", jdbc.queryForObject(
                "SELECT nro_telefono FROM pasajero WHERE numero_documento='22222222'", String.class));

        // Con datos inválidos no queda nada en caché: confirmar falla y no se guarda nada.
        String otra = sesionConAsientos(3);
        continuar(otra, List.of(pasajero(3, "33333333", "Luis", "Perez", "955555555")));
        var invalido = continuar(otra, List.of(pasajero(3, "33333333", "Luis", "Perez", "123")));
        assertFalse(invalido.get("valido").asBoolean());
        assertEquals("nroTelefono", invalido.get("errores").get(0).get("campo").asText());
        assertEquals(409, confirmar(otra).statusCode());
        assertEquals(0, cuenta("SELECT COUNT(*) FROM pasajero WHERE numero_documento='33333333'"));
    }

    @Test
    void datosIncompletosRepetidosOAjenosSeRechazan() throws Exception {
        String token = sesionConAsientos(1, 2);
        assertFalse(continuar(token, dosPasajeros().subList(0, 1)).get("valido").asBoolean());
        var repetidos = List.of(pasajero(1, "22222222", "Ana", "Uno", "911111111"), pasajero(2, "22222222", "Beto", "Dos", "922222222"));
        assertFalse(continuar(token, repetidos).get("valido").asBoolean());

        sesionConAsientos(3); // asiento 3 pertenece a otra sesión
        var cruzado = continuar(token, List.of(pasajero(3, "22222222", "Carlos", "Quispe", "933333333")));
        assertFalse(cruzado.get("valido").asBoolean());
        assertEquals(409, confirmar(token).statusCode());
        assertNadaPersistido();
    }

    @Test
    void sesionInvalidaOAsientosVencidosNoConfirmanNiGuardan() throws Exception {
        var falsa = enviar("POST", "/api/viajes/" + VIAJE + "/pasajeros",
                Map.of("tokenSesion", "token-falso", "pasajeros", dosPasajeros()), null);
        assertEquals(401, falsa.statusCode());
        assertEquals(401, confirmar("token-falso").statusCode());

        String token = sesionConAsientos(1, 2);
        continuar(token, dosPasajeros());
        jdbc.update("UPDATE viaje_asiento SET fecha_expiracion_bloqueo = DATEADD('MINUTE', -1, CURRENT_TIMESTAMP) WHERE token_bloqueo IS NOT NULL");
        assertEquals(409, confirmar(token).statusCode());
        assertNadaPersistido(); // la transacción se revierte: tampoco se actualiza el celular de ANA
    }
}
