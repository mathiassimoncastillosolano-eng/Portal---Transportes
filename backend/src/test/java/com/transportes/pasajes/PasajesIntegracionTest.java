package com.transportes.pasajes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.RelojPruebaConfiguracion;
import com.transportes.RelojPruebaConfiguracion.RelojPrueba;
import com.transportes.pasajes.dto.PaginaPasajesDto;
import com.transportes.pasajes.dto.PasajeDto;
import com.transportes.pasajes.servicios.PasajesServicio;

@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:pasajes;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,classpath:schema-compras-test.sql"
})
class PasajesIntegracionTest {

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired RelojPrueba reloj;
    @Autowired PasajesServicio servicio;

    int p1;
    int p2;
    int p3;
    int p4;

    @BeforeEach
    void preparar() {
        reloj.fijar(LocalDateTime.of(2026, 10, 12, 10, 0));
        for (String tabla : List.of("postergacion", "comprobante", "pasaje", "pago", "operacion_pago", "venta",
                "viaje_asiento", "pasajero", "asiento", "viaje", "bus", "programacion_viaje", "ruta", "agencia",
                "tipo_bus", "ubicacion")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO ubicacion(id_ubicacion,nombre,activa) OVERRIDING SYSTEM VALUE "
                + "VALUES(1,'Lima',true),(2,'Cusco',true),(3,'Arequipa',true)");
        jdbc.update("INSERT INTO agencia(id_agencia,id_ubicacion,activa) VALUES(1,1,true),(2,2,true),(3,3,true)");
        jdbc.update("INSERT INTO ruta(id_ruta,id_agencia_origen,id_agencia_destino,duracion_estimada_min,activa) "
                + "VALUES(1,1,2,600,true),(2,2,3,300,true)");
        jdbc.update("INSERT INTO programacion_viaje(id_programacion,id_ruta,activa) VALUES(1,1,true),(2,2,true)");
        jdbc.update("INSERT INTO tipo_bus(id_tipo_bus,nombre_tipo) OVERRIDING SYSTEM VALUE VALUES(1,'Bus Cama')");
        jdbc.update("INSERT INTO bus(id_bus,id_tipo_bus,activo) VALUES(1,1,true)");
        insertarViaje(4, 1, "2026-10-01", "PROGRAMADO");
        insertarViaje(5, 1, "2026-10-19", "PROGRAMADO");
        insertarViaje(6, 2, "2026-10-21", "PROGRAMADO");
        insertarViaje(7, 1, "2026-10-25", "CANCELADO");
        insertarAsiento(1, "1A", 4, "40.00");
        insertarAsiento(2, "2A", 5, "50.00");
        insertarAsiento(3, "3A", 6, "60.00");
        insertarAsiento(4, "4A", 7, "70.00");
        jdbc.update("INSERT INTO pasajero(id_pasajero,tipo_documento,numero_documento,nombres,apellidos) "
                + "OVERRIDING SYSTEM VALUE VALUES(1,'DNI','11111111','ANA','LOPEZ'),(2,'DNI','22222222','JOSE','PEREZ')");
        p1 = insertarPasaje(1, 1, "40.00");
        p2 = insertarPasaje(1, 2, "50.00");
        p3 = insertarPasaje(2, 3, "60.00");
        p4 = insertarPasaje(2, 4, "70.00");
        jdbc.update("UPDATE venta SET estado_venta = 'PENDIENTE' WHERE id_venta = "
                + jdbc.queryForObject("SELECT id_venta FROM pasaje WHERE id_pasaje = ?", Integer.class, p4));
    }

    PaginaPasajesDto listar(String q, Integer idPasajero, String origen, String destino, String desde, String hasta,
            String estado, String fase, String orden, String direccion, int pagina, int tamano) {
        return servicio.listar(q, idPasajero, origen, destino, desde, hasta, estado, fase, orden, direccion, pagina,
                tamano);
    }

    PaginaPasajesDto todos() {
        return listar(null, null, null, null, null, null, null, null, null, null, 0, 20);
    }

    List<Integer> ids(PaginaPasajesDto pagina) {
        return pagina.contenido().stream().map(PasajeDto::idPasaje).toList();
    }

    @Test
    void sinSesionNoSePuedeConsultar() throws Exception {
        HttpResponse<String> r = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/pasajes")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(401, r.statusCode());
    }

    @Test
    void listaTodosConSuResumenYElOrdenPorSalidaDescendente() {
        PaginaPasajesDto pagina = todos();
        assertEquals(4, pagina.total());
        assertEquals(List.of(p4, p3, p2, p1), ids(pagina));
        assertEquals(3, pagina.resumen().confirmados());
        assertEquals(2, pagina.resumen().proximos());
        assertEquals(0, new BigDecimal("150.00").compareTo(pagina.resumen().ingresos()));
    }

    @Test
    void elPasajeTraeLosDatosDelBoleto() {
        PasajeDto pasaje = listar(null, 1, null, null, null, null, null, "REALIZADO", null, null, 0, 20)
                .contenido().get(0);
        assertEquals(p1, pasaje.idPasaje());
        assertEquals("ANA LOPEZ", pasaje.pasajero());
        assertEquals("DNI 11111111", pasaje.documento());
        assertEquals("Lima", pasaje.origen());
        assertEquals("Cusco", pasaje.destino());
        assertEquals("CONFIRMADA", pasaje.estadoPasaje());
        assertEquals("1A", pasaje.asiento());
        assertEquals("Bus Cama", pasaje.bus());
        assertTrue(pasaje.documentoDisponible());
        assertEquals("08:00", pasaje.horaSalida());
    }

    @Test
    void filtraPorCliente() {
        assertEquals(List.of(p2, p1), ids(listar(null, 1, null, null, null, null, null, null, null, null, 0, 20)));
    }

    @Test
    void filtraPorFaseYEstado() {
        assertEquals(List.of(p1), ids(listar(null, null, null, null, null, null, null, "REALIZADO", null, null, 0, 20)));
        assertEquals(List.of(p3, p2), ids(listar(null, null, null, null, null, null, null, "PROXIMO", null, null, 0, 20)));
        assertEquals(List.of(p4), ids(listar(null, null, null, null, null, null, null, "OTROS", null, null, 0, 20)));
        assertEquals(List.of(p4), ids(listar(null, null, null, null, null, null, "SIN_CONFIRMAR", null, null, null, 0, 20)));
    }

    @Test
    void filtraPorRangoDeFechasDeSalida() {
        assertEquals(List.of(p3, p2), ids(listar(null, null, null, null, "2026-10-15", "2026-10-22", null, null, null, null, 0, 20)));
        assertEquals(List.of(p4), ids(listar(null, null, null, null, "2026-10-22", null, null, null, null, null, 0, 20)));
    }

    @Test
    void filtraPorOrigenYDestino() {
        assertEquals(List.of(p3), ids(listar(null, null, "cusco", null, null, null, null, null, null, null, 0, 20)));
        assertEquals(List.of(p4, p2, p1), ids(listar(null, null, null, "Cusco", null, null, null, null, null, null, 0, 20)));
        assertEquals(List.of(), ids(listar(null, null, "Lima", "Arequipa", null, null, null, null, null, null, 0, 20)));
    }

    @Test
    void buscaPorNombreSinTildesPorDocumentoYPorVariasPalabras() {
        assertEquals(List.of(p2, p1), ids(listar("ana", null, null, null, null, null, null, null, null, null, 0, 20)));
        assertEquals(List.of(p4, p3), ids(listar("22222222", null, null, null, null, null, null, null, null, null, 0, 20)));
        assertEquals(List.of(p4, p3), ids(listar("jose pérez", null, null, null, null, null, null, null, null, null, 0, 20)));
    }

    @Test
    void ordenaPorPrecioYPagina() {
        assertEquals(List.of(p1, p2, p3, p4), ids(listar(null, null, null, null, null, null, null, null, "precio", "asc", 0, 20)));
        PaginaPasajesDto segunda = listar(null, null, null, null, null, null, null, null, "precio", "asc", 1, 3);
        assertEquals(List.of(p4), ids(segunda));
        assertEquals(4, segunda.total());
    }

    @Test
    void ofreceSoloOrigenesYDestinosConPasajes() {
        assertEquals(List.of("Cusco", "Lima"), servicio.opciones().origenes());
        assertEquals(List.of("Arequipa", "Cusco"), servicio.opciones().destinos());
    }

    @Test
    void rechazaFiltrosNoValidos() {
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> listar(null, null, null, null, null, null, "OTRO", null, null, null, 0, 20)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> listar(null, null, null, null, "2026-11-01", "2026-10-01", null, null, null, null, 0, 20)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> listar(null, null, null, null, "no-es-fecha", null, null, null, null, null, 0, 20)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> listar(null, null, null, null, null, null, null, null, null, null, 0, 500)).getStatusCode().value());
    }

    void insertarViaje(int id, int programacion, String fecha, String estado) {
        jdbc.update("INSERT INTO viaje(id_viaje,id_programacion,id_bus,fecha_salida,hora_salida,estado_viaje) "
                + "VALUES(?,?,1,DATE '" + fecha + "',CAST('08:00:00' AS TIME),?)", id, programacion, estado);
    }

    void insertarAsiento(int id, String numero, int viaje, String precio) {
        jdbc.update("INSERT INTO asiento(id_asiento,id_bus,numero_asiento) VALUES(?,1,?)", id, numero);
        jdbc.update("INSERT INTO viaje_asiento(id_viaje_asiento,id_viaje,precio,estado_viaje_asiento,id_asiento) "
                + "VALUES(?,?,?,'OCUPADO',?)", id, viaje, new BigDecimal(precio), id);
    }

    int insertarPasaje(int idPasajero, int idViajeAsiento, String precio) {
        jdbc.update("INSERT INTO venta(id_usuario,monto_total,estado_venta) VALUES(NULL,43,'PAGADA')");
        int venta = jdbc.queryForObject("SELECT MAX(id_venta) FROM venta", Integer.class);
        jdbc.update("INSERT INTO metodo_pago(nombre_metodo) SELECT 'Prueba' WHERE NOT EXISTS (SELECT 1 FROM metodo_pago)");
        int metodo = jdbc.queryForObject("SELECT MIN(id_metodo_pago) FROM metodo_pago", Integer.class);
        jdbc.update("INSERT INTO pago(id_venta,id_metodo_pago,monto,estado_pago) VALUES(?,?,43,'APROBADO')", venta, metodo);
        jdbc.update("INSERT INTO pasaje(id_venta,id_pasajero,id_viaje_asiento,precio) VALUES(?,?,?,?)",
                venta, idPasajero, idViajeAsiento, new BigDecimal(precio));
        return jdbc.queryForObject("SELECT MAX(id_pasaje) FROM pasaje", Integer.class);
    }
}
