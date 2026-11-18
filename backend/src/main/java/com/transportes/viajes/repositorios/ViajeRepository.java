package com.transportes.viajes.repositorios;

import com.transportes.viajes.dto.ViajeResumenDto;
import com.transportes.viajes.reglas.PoliticaReservaViaje;
import com.transportes.viajes.reglas.PoliticaReservaViaje.EstadoReserva;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import com.transportes.viajes.reglas.FranjaHorario;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Consulta SQL (JdbcTemplate) de la búsqueda de viajes: viajes PROGRAMADOS de la ruta y fecha, con asientos
 * libres, precio mínimo y capacidad. Luego cada viaje pasa por PoliticaReservaViaje para saber si se puede
 * reservar.
 */
@Repository
public class ViajeRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public ViajeRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    // Se listan TODOS los viajes PROGRAMADOS del día, también los que ya salieron, los que cerraron reserva y los
    // llenos: si se puede reservar o no lo decide PoliticaReservaViaje, no el WHERE. Los cancelados no aparecen.
    // Asientos y servicios se cuentan por separado: si se unieran antes del COUNT, cada asiento se contaría una
    // vez por cada servicio del bus.
    private static final String BUSQUEDA = """
        SELECT v.id_viaje, uo.nombre AS origen, ud.nombre AS destino,
               v.fecha_salida, v.hora_salida, r.duracion_estimada_min,
               v.estado_viaje, tb.nombre_tipo, COALESCE(a.total, 0) AS total_asientos,
               COALESCE(a.disponibles, 0) AS disponibles, a.precio, COALESCE(s.servicios, '') AS servicios,
               uo.distrito AS terminal_origen, ud.distrito AS terminal_destino
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
            SELECT id_viaje, COUNT(*) AS total,
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
        WHERE LOWER(uo.nombre) = LOWER(:origen)
          AND LOWER(ud.nombre) = LOWER(:destino)
          AND v.fecha_salida = :fecha AND v.estado_viaje = 'PROGRAMADO'
          AND pv.activa AND r.activa AND ao.activa AND ad.activa
          AND uo.activa AND ud.activa AND b.activo
          AND %s
        ORDER BY v.hora_salida, v.id_viaje
        """;

    private static final String CONDICION_HORAS = """
        EXTRACT(HOUR FROM v.hora_salida) >= :horaDesde
          AND EXTRACT(HOUR FROM v.hora_salida) < :horaHasta
        """;

    /** Viajes del día cuya hora de salida está entre desde (incluido) y hasta (excluido). */
    public List<ViajeResumenDto> buscar(String origen, String destino, LocalDate fecha, int desde, int hasta,
            LocalDateTime ahora) {
        Map<String, Object> parametros = new HashMap<>();
        parametros.put("origen", origen);
        parametros.put("destino", destino);
        parametros.put("fecha", fecha);
        parametros.put("horaDesde", desde);
        parametros.put("horaHasta", hasta);
        return jdbc.query(BUSQUEDA.formatted(CONDICION_HORAS), parametros, (rs, fila) -> mapear(rs, ahora));
    }

    /** Lo mismo, pero con varias franjas horarias. */
    public List<ViajeResumenDto> buscarPorFranjas(String origen, String destino, LocalDate fecha,
            List<FranjaHorario> franjas, LocalDateTime ahora) {
        Map<String, Object> parametros = new HashMap<>();
        parametros.put("origen", origen);
        parametros.put("destino", destino);
        parametros.put("fecha", fecha);
        List<String> condiciones = new ArrayList<>();
        for (int i = 0; i < franjas.size(); i++) {
            condiciones.add("(EXTRACT(HOUR FROM v.hora_salida) * 60 + EXTRACT(MINUTE FROM v.hora_salida) >= :desde" + i
                    + " AND EXTRACT(HOUR FROM v.hora_salida) * 60 + EXTRACT(MINUTE FROM v.hora_salida) < :hasta" + i + ")");
            parametros.put("desde" + i, franjas.get(i).desdeMinuto());
            parametros.put("hasta" + i, franjas.get(i).hastaMinuto());
        }
        String condicion = condiciones.isEmpty() ? "TRUE" : "(" + String.join(" OR ", condiciones) + ")";
        return jdbc.query(BUSQUEDA.formatted(condicion), parametros, (rs, fila) -> mapear(rs, ahora));
    }

    private ViajeResumenDto mapear(ResultSet rs, LocalDateTime ahora) throws SQLException {
        LocalDate salida = rs.getObject("fecha_salida", LocalDate.class);
        LocalTime hora = rs.getObject("hora_salida", LocalTime.class);
        Integer minutos = rs.getObject("duracion_estimada_min", Integer.class);
        var llegada = minutos == null ? null : salida.atTime(hora).plusMinutes(minutos);
        String duracion = minutos == null ? "Por confirmar" : minutos / 60 + " h"
                + (minutos % 60 == 0 ? "" : " " + minutos % 60 + " min");
        int disponibles = rs.getInt("disponibles");
        int total = rs.getInt("total_asientos");
        EstadoReserva reserva = PoliticaReservaViaje.evaluar(rs.getString("estado_viaje"), salida, hora,
                total, disponibles, ahora);
        return new ViajeResumenDto(rs.getLong("id_viaje"), "RutaLibre",
                rs.getString("origen"), rs.getString("destino"), salida, hora.format(HORA),
                llegada == null ? null : llegada.format(HORA), llegada == null ? null : llegada.toLocalDate(),
                duracion, rs.getString("nombre_tipo"),
                Arrays.stream(rs.getString("servicios").split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList(),
                disponibles, rs.getBigDecimal("precio"),
                disponibles == 0 ? "agotado" : disponibles <= 4 ? "pocos-asientos" : "disponible",
                reserva.name(), reserva.reservable(),
                PoliticaReservaViaje.aEpochMs(salida.atTime(hora)),
                PoliticaReservaViaje.aEpochMs(PoliticaReservaViaje.limiteReserva(salida, hora)),
                PoliticaReservaViaje.aEpochMs(ahora), PoliticaReservaViaje.MINUTOS_ANTICIPACION,
                total, limpiar(rs.getString("terminal_origen")), limpiar(rs.getString("terminal_destino")), minutos);
    }

    private static String limpiar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
