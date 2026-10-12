package com.transportes.viajes;

import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import com.transportes.RelojPruebaConfiguracion;
import com.transportes.RelojPruebaConfiguracion.RelojPrueba;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@ActiveProfiles("test")
@Import(RelojPruebaConfiguracion.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:viajes;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-viajes-test.sql",
    // Esquema reducido solo para la búsqueda (consultas nativas): no se validan las demás entidades JPA.
    "spring.jpa.hibernate.ddl-auto=none"
})
class BusquedaIntegracionTest {
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired RelojPrueba reloj;
    final HttpClient http = HttpClient.newHttpClient();
    final LocalDate fechaSalida = LocalDate.now().plusDays(7);
    final String base = "/api/viajes/buscar?origen=Lima&destino=Cusco&fecha=" + fechaSalida;

    @BeforeEach void preparar() {
        reloj.liberar();
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
            jdbc.update("INSERT INTO viaje VALUES(?,1,1,?,CAST(? AS TIME),'PROGRAMADO')", i+1, fechaSalida, horas[i]);
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
        assertEquals(fechaSalida.plusDays(1).toString(),datos.get(6).get("fechaLlegada").asText());
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
        for (String ruta:List.of(base+"&horario=invalido",base.replace(fechaSalida.toString(),"no-fecha"),
                base.replace("&fecha=" + fechaSalida,""),base.replace("destino=Cusco","destino=LIMA"),
                base.replace("origen=Lima","origen=%20"))) {
            var r=get(ruta); assertEquals(400,r.statusCode(),r.body());
            assertTrue(json.readTree(r.body()).has("mensaje"));
        }
        var vacio=get(base.replace(fechaSalida.toString(),fechaSalida.plusDays(1).toString()));
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

    // ---- Viajes que ya salieron, que cierran la reserva o están llenos: se LISTAN, pero no se pueden reservar ----

    private void ahoraEs(int hora, int minuto, int segundo) {
        reloj.fijar(LocalDateTime.of(fechaSalida, java.time.LocalTime.of(hora, minuto, segundo)));
    }

    @Test void listaTodosLosViajesDelDiaConSuEstadoDeReserva() throws Exception {
        ahoraEs(18, 45, 0); // salidas 00:00, 05:59:59, 06:00, 11:59:59 y 12:00 ya ocurrieron; 18:59:59 y 19:00 cierran
        var r = get(base);
        assertEquals(200, r.statusCode(), r.body());
        var datos = json.readTree(r.body());
        assertEquals(8, datos.size(), "ningún viaje del día desaparece por haber salido o estar por salir");
        String[] esperado = {"SALIDA_REALIZADA", "SALIDA_REALIZADA", "SALIDA_REALIZADA", "SALIDA_REALIZADA",
                "SALIDA_REALIZADA", "RESERVA_CERRADA", "RESERVA_CERRADA", "DISPONIBLE"};
        for (int i = 0; i < esperado.length; i++) {
            assertEquals(esperado[i], datos.get(i).get("estadoReserva").asText(), "viaje " + (i + 1));
            assertEquals("DISPONIBLE".equals(esperado[i]), datos.get(i).get("reservable").asBoolean(), "viaje " + (i + 1));
            assertEquals(20, datos.get(i).get("minutosAnticipacion").asInt());
        }
        // Los instantes salen en ms UTC de la hora de Lima; el servidor entrega su propia hora de referencia.
        long limite = datos.get(6).get("limiteReservaMs").asLong();
        assertEquals(20 * 60 * 1000L, datos.get(6).get("salidaMs").asLong() - limite);
        assertTrue(datos.get(6).get("ahoraServidorMs").asLong() > limite);
    }

    @Test void limiteDeVeinteMinutosEsInclusivo() throws Exception {
        ahoraEs(18, 40, 0); // viaje de las 19:00: justo 20 minutos antes
        assertEquals("DISPONIBLE", json.readTree(get(base).body()).get(6).get("estadoReserva").asText());
        ahoraEs(18, 40, 1);
        assertEquals("RESERVA_CERRADA", json.readTree(get(base).body()).get(6).get("estadoReserva").asText());
        ahoraEs(19, 0, 0);
        assertEquals("SALIDA_REALIZADA", json.readTree(get(base).body()).get(6).get("estadoReserva").asText());
    }

    @Test void viajeLlenoSeListaPeroNoEsReservable() throws Exception {
        ahoraEs(1, 0, 0);
        jdbc.update("UPDATE viaje_asiento SET estado_viaje_asiento='VENDIDO' WHERE id_viaje=8");
        var viaje = json.readTree(get(base).body()).get(7);
        assertEquals(0, viaje.get("asientosDisponibles").asInt());
        assertEquals("agotado", viaje.get("estado").asText());
        assertEquals("LLENO", viaje.get("estadoReserva").asText());
        assertFalse(viaje.get("reservable").asBoolean());
    }

    @Test void sinAsientosRegistradosNoSeDeclaraLleno() throws Exception {
        ahoraEs(1, 0, 0);
        jdbc.update("DELETE FROM viaje_asiento WHERE id_viaje=8");
        var viaje = json.readTree(get(base).body()).get(7);
        assertEquals("SIN_INFORMACION", viaje.get("estadoReserva").asText());
        assertFalse(viaje.get("reservable").asBoolean());
    }

    @Test void fechaPasadaMuestraLosViajesComoSalidaRealizada() throws Exception {
        String ayer = LocalDate.now().minusDays(1).toString();
        jdbc.update("UPDATE viaje SET fecha_salida = ? WHERE id_viaje = 1", LocalDate.now().minusDays(1));
        var r = get(base.replace(fechaSalida.toString(), ayer));
        var datos = json.readTree(r.body());
        assertEquals(1, datos.size());
        assertEquals("SALIDA_REALIZADA", datos.get(0).get("estadoReserva").asText());
        assertFalse(datos.get(0).get("reservable").asBoolean());
    }

    @Test void viajeCanceladoSigueOcultoAunqueAhoraSeListenLosViajesSalidos() throws Exception {
        ahoraEs(23, 0, 0);
        jdbc.update("UPDATE viaje SET estado_viaje='CANCELADO' WHERE id_viaje=3");
        assertEquals(7, json.readTree(get(base).body()).size());
    }
}
