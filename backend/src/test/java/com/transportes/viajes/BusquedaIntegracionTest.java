package com.transportes.viajes;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:viajes;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-viajes-test.sql"
})
class BusquedaIntegracionTest {
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    final HttpClient http = HttpClient.newHttpClient();
    final String base = "/api/viajes/buscar?origen=Lima&destino=Cusco&fecha=2026-09-23";

    @BeforeEach void preparar() {
        for (String tabla : List.of("viaje_asiento", "viaje", "tipo_bus_servicio", "servicio_bus", "bus", "programacion_viaje", "ruta", "agencia", "ubicacion", "tipo_bus")) {
            jdbc.update("DELETE FROM " + tabla);
        }
        jdbc.update("INSERT INTO ubicacion(id_ubicacion,nombre,activa) OVERRIDING SYSTEM VALUE VALUES(1,'Lima',true),(2,'Cusco',true)");
        jdbc.update("INSERT INTO agencia VALUES(1,1,true),(2,2,true)");
        jdbc.update("INSERT INTO ruta VALUES(1,1,2,1260,true)");
        jdbc.update("INSERT INTO programacion_viaje VALUES(1,1,true)");
        jdbc.update("INSERT INTO tipo_bus(id_tipo_bus,nombre_tipo) OVERRIDING SYSTEM VALUE VALUES(1,'Bus Cama')");
        jdbc.update("INSERT INTO bus VALUES(1,1,true)");
        jdbc.update("INSERT INTO servicio_bus VALUES(1,'WiFi'),(2,'TV'),(3,'Baño')");
        jdbc.update("INSERT INTO tipo_bus_servicio VALUES(1,1),(1,2),(1,3)");
        String[] horas = {"00:00:00", "05:59:59", "06:00:00", "11:59:59", "12:00:00", "18:59:59", "19:00:00", "23:59:59"};
        for (int i=0; i<horas.length; i++) {
            jdbc.update("INSERT INTO viaje VALUES(?,1,1,DATE '2026-09-23',CAST(? AS TIME),'PROGRAMADO')", i+1, horas[i]);
            jdbc.update("INSERT INTO viaje_asiento VALUES(?,?,90,'DISPONIBLE'),(?,?,120,'DISPONIBLE'),(?,?,1,'VENDIDO'),(?,?,2,'BLOQUEADO')",
                    i*4+1,i+1,i*4+2,i+1,i*4+3,i+1,i*4+4,i+1);
        }
    }

    HttpResponse<String> get(String ruta) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+ruta)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void busquedaRealSinMultiplicarAsientosPorServicios() throws Exception {
        var r=get(base);
        assertEquals(200,r.statusCode(),r.body());
        var datos=json.readTree(r.body());
        assertEquals(8,datos.size());
        for (var viaje:datos) {
            assertTrue(viaje.get("id").asLong()>0);
            assertEquals(2,viaje.get("asientosDisponibles").asInt());
            assertEquals(90,viaje.get("precio").asInt());
            assertEquals(3,viaje.get("servicios").size());
            assertEquals("pocos-asientos",viaje.get("estado").asText());
        }
        assertEquals("2026-09-24",datos.get(6).get("fechaLlegada").asText());
        assertEquals("16:00",datos.get(6).get("horaLlegada").asText());
    }

    @Test void cuatroFranjasConLimitesExactos() throws Exception {
        String[] filtros={"madrugada","ma%C3%B1ana","tarde","noche"};
        for (int i=0;i<filtros.length;i++) {
            var r=get(base+"&horario="+filtros[i]);
            assertEquals(200,r.statusCode(),r.body());
            var datos=json.readTree(r.body());
            assertEquals(2,datos.size());
            assertEquals(i*2+1,datos.get(0).get("id").asInt());
            assertEquals(i*2+2,datos.get(1).get("id").asInt());
        }
        assertEquals(get(base+"&horario=ma%C3%B1ana").body(),get(base+"&horario=manana").body());
    }

    @Test void validaParametrosYSinResultados() throws Exception {
        for (String ruta:List.of(base+"&horario=invalido",base.replace("2026-09-23","no-fecha"),
                base.replace("&fecha=2026-09-23",""),base.replace("destino=Cusco","destino=LIMA"),
                base.replace("origen=Lima","origen=%20"))) {
            var r=get(ruta); assertEquals(400,r.statusCode(),r.body());
            assertTrue(json.readTree(r.body()).has("mensaje"));
        }
        var vacio=get(base.replace("2026-09-23","2026-09-24"));
        assertEquals(200,vacio.statusCode()); assertEquals("[]",vacio.body());
        assertEquals(get(base).body(),get(base.replace("Lima","%20lImA%20").replace("Cusco","CUSCO")).body());
    }

    @Test void excluyeCanceladosYConfiguracionesInactivas() throws Exception {
        jdbc.update("UPDATE viaje SET estado_viaje='CANCELADO' WHERE id_viaje=1");
        assertEquals(7,json.readTree(get(base).body()).size());
        for (String[] objetivo:new String[][]{{"bus","activo"},{"programacion_viaje","activa"},{"ruta","activa"},{"agencia","activa"},{"ubicacion","activa"}}) {
            jdbc.update("UPDATE "+objetivo[0]+" SET "+objetivo[1]+"=false");
            assertEquals("[]",get(base).body());
            jdbc.update("UPDATE "+objetivo[0]+" SET "+objetivo[1]+"=true");
        }
    }

    @Test void sinAsientosNiDuracionNoInventaPrecios() throws Exception {
        jdbc.update("DELETE FROM viaje_asiento");
        jdbc.update("UPDATE ruta SET duracion_estimada_min=null");
        var datos=json.readTree(get(base).body());
        assertEquals(8,datos.size());
        assertEquals(0,datos.get(0).get("asientosDisponibles").asInt());
        assertEquals("agotado",datos.get(0).get("estado").asText());
        assertTrue(datos.get(0).get("precio").isNull());
        assertTrue(datos.get(0).get("horaLlegada").isNull());
        assertEquals("Por confirmar",datos.get(0).get("duracion").asText());
    }

    @Test void corsPermiteElFrontend() throws Exception {
        var r=http.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+base))
            .header("Origin","http://localhost:5173").header("Access-Control-Request-Method","GET")
            .method("OPTIONS",HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(200,r.statusCode());
        assertEquals("http://localhost:5173",r.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
    }
}
