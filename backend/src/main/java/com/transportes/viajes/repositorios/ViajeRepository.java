package com.transportes.viajes.repositorios;

import com.transportes.viajes.dto.ViajeResumenDto;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import com.transportes.viajes.dto.TipoServicioDto;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ViajeRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public ViajeRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    // Se agregan asientos y servicios por separado: unir ambas colecciones antes
    // del COUNT multiplica cada asiento por el número de servicios del bus.
    private static final String BUSQUEDA = """
        SELECT v.id_viaje, uo.nombre AS origen, ud.nombre AS destino,
               v.fecha_salida, v.hora_salida, r.duracion_estimada_min,
               tb.nombre_tipo, COALESCE(a.disponibles, 0) AS disponibles,
               a.precio, COALESCE(s.servicios, '') AS servicios
        FROM viaje v
        JOIN programacion_viaje pv ON pv.id_programacion = v.id_programacion
        JOIN ruta r ON r.id_ruta = pv.id_ruta
        JOIN agencia ao ON ao.id_agencia = r.id_agencia_origen
        JOIN ubicacion uo ON uo.id_ubicacion = ao.id_ubicacion
        JOIN agencia ad ON ad.id_agencia = r.id_agencia_destino
        JOIN ubicacion ud ON ud.id_ubicacion = ad.id_ubicacion
        JOIN bus b ON b.id_bus = v.id_bus
        JOIN tipo_bus tb ON tb.id_tipo_bus = b.id_tipo_bus
        LEFT JOIN (
            SELECT id_viaje,
                   SUM(CASE WHEN estado_viaje_asiento = 'DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles,
                   MIN(CASE WHEN estado_viaje_asiento = 'DISPONIBLE' THEN precio END) AS precio
            FROM viaje_asiento GROUP BY id_viaje
        ) a ON a.id_viaje = v.id_viaje
        LEFT JOIN (
            SELECT tbs.id_tipo_bus, STRING_AGG(sb.nombre_servicio, ',' ORDER BY sb.nombre_servicio) AS servicios
            FROM tipo_bus_servicio tbs
            JOIN servicio_bus sb ON sb.id_servicio_bus = tbs.id_servicio_bus
            GROUP BY tbs.id_tipo_bus
        ) s ON s.id_tipo_bus = tb.id_tipo_bus
        WHERE v.estado_viaje = 'PROGRAMADO'
          AND pv.activa AND r.activa AND ao.activa AND ad.activa
          AND uo.activa AND ud.activa AND b.activo
        """;

    public List<ViajeResumenDto> buscar(String origen, String destino, LocalDate fecha, int desde, int hasta) {
        return buscar(origen, destino, fecha, desde, hasta, List.of());
    }

    public List<ViajeResumenDto> buscar(String origen, String destino, LocalDate fecha, int desde, int hasta, List<String> tipos) {
        var parametros = new HashMap<String, Object>(Map.of("origen", origen, "destino", destino,
                "fecha", fecha, "horaDesde", desde, "horaHasta", hasta));
        String filtro = " AND LOWER(uo.nombre)=LOWER(:origen) AND LOWER(ud.nombre)=LOWER(:destino)"
                + " AND v.fecha_salida=:fecha AND EXTRACT(HOUR FROM v.hora_salida)>=:horaDesde"
                + " AND EXTRACT(HOUR FROM v.hora_salida)<:horaHasta";
        if (!tipos.isEmpty()) {
            filtro += " AND LOWER(tb.nombre_tipo) IN (:tipos)";
            parametros.put("tipos", tipos);
        }
        return consultar(filtro + " ORDER BY v.hora_salida, v.id_viaje", parametros);
    }

    public List<ViajeResumenDto> detalle(long id) {
        return consultar(" AND v.id_viaje=:id", Map.of("id", id));
    }

    public List<TipoServicioDto> tipos() {
        return jdbc.query("SELECT id_tipo_bus,nombre_tipo FROM tipo_bus ORDER BY nombre_tipo", Map.of(),
                (rs, fila) -> new TipoServicioDto(rs.getLong("id_tipo_bus"), rs.getString("nombre_tipo")));
    }

    private List<ViajeResumenDto> consultar(String filtro, Map<String, ?> parametros) {
        return jdbc.query(BUSQUEDA + filtro, parametros, (rs, fila) -> {
            LocalDate salida = rs.getObject("fecha_salida", LocalDate.class);
            LocalTime hora = rs.getObject("hora_salida", LocalTime.class);
            Integer minutos = rs.getObject("duracion_estimada_min", Integer.class);
            var llegada = minutos == null ? null : salida.atTime(hora).plusMinutes(minutos);
            String duracion = minutos == null ? "Por confirmar" : minutos / 60 + " h"
                    + (minutos % 60 == 0 ? "" : " " + minutos % 60 + " min");
            int disponibles = rs.getInt("disponibles");
            return new ViajeResumenDto(rs.getLong("id_viaje"), "RutaLibre",
                    rs.getString("origen"), rs.getString("destino"), salida, hora.format(HORA),
                    llegada == null ? null : llegada.format(HORA), llegada == null ? null : llegada.toLocalDate(),
                    duracion, rs.getString("nombre_tipo"),
                    Arrays.stream(rs.getString("servicios").split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList(),
                    disponibles, rs.getBigDecimal("precio"),
                    disponibles == 0 ? "agotado" : disponibles < 10 ? "pocos-asientos" : "disponible");
        });
    }
}
