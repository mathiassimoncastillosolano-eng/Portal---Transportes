package com.transportes.clientes.repositorios;

import com.transportes.clientes.dto.ClienteResumenDto;
import com.transportes.clientes.dto.IndicadoresClientesDto;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Consultas SQL de solo lectura (con JdbcTemplate) para el panel de clientes. Los filtros siempre van como
 * parámetros "?", nunca pegados al texto, para evitar inyección SQL.
 */
@Repository
public class ClientesRepositorio {

    public record FiltroClientes(List<String> terminos, String tipoDocumento, String actividad, String orden,
            boolean ascendente, int limite, int desplazamiento) {
    }

    public record DatosPasajero(int idPasajero, String tipoDocumento, String numeroDocumento, String nombres,
            String apellidos, String telefono, LocalDate fechaNacimiento, LocalDateTime fechaRegistro,
            int viajes, LocalDateTime primerViaje, LocalDateTime ultimoViaje, LocalDateTime proximoViaje) {
    }

    public record FilaHistorial(
            int idPasaje, BigDecimal precio, int idVenta, String estadoVenta, String estadoPago,
            String estadoOperacion, String moneda, String serie, String numero, String asiento, Short piso,
            LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje, String origen, String destino,
            String tipoBus, Integer duracionMin) {
    }

    private static final String CONFIRMADO = """
            UPPER(TRIM(ve.estado_venta)) = 'PAGADA'
            AND UPPER(TRIM(pg.estado_pago)) = 'APROBADO'
            AND COALESCE(UPPER(TRIM(op.estado)), '') <> 'REEMBOLSADO'
            AND UPPER(TRIM(v.estado_viaje)) = 'PROGRAMADO'
            """;

    private static final String VIAJES_CONFIRMADOS = """
            SELECT pa.id_pasaje, pa.id_pasajero, (v.fecha_salida + v.hora_salida) AS salida
            FROM pasaje pa
            JOIN venta ve ON ve.id_venta = pa.id_venta
            JOIN pago pg ON pg.id_venta = ve.id_venta
            LEFT JOIN operacion_pago op ON op.id_venta = ve.id_venta
            JOIN viaje_asiento va ON va.id_viaje_asiento = pa.id_viaje_asiento
            JOIN viaje v ON v.id_viaje = va.id_viaje
            WHERE\s""" + CONFIRMADO;

    private static final String NOMBRE_NORMALIZADO =
            "TRANSLATE(LOWER(pj.nombres || ' ' || pj.apellidos), 'áéíóúüñ', 'aeiouun')";

    private static final String BASE = """
            SELECT pj.id_pasajero, pj.tipo_documento, pj.numero_documento, pj.nombres, pj.apellidos, pj.nro_telefono,
                   COUNT(vp.id_pasaje) AS viajes,
                   MAX(CASE WHEN vp.salida <= :ahora THEN vp.salida END) AS ultimo_viaje,
                   MIN(CASE WHEN vp.salida > :ahora THEN vp.salida END) AS proximo_viaje
            FROM pasajero pj
            LEFT JOIN (%s) vp ON vp.id_pasajero = pj.id_pasajero
            WHERE %s
            GROUP BY pj.id_pasajero, pj.tipo_documento, pj.numero_documento, pj.nombres, pj.apellidos, pj.nro_telefono
            """;

    private static final String HISTORIAL = """
            SELECT pa.id_pasaje, pa.precio AS precio_pasaje, ve.id_venta, ve.estado_venta, pg.estado_pago,
                   op.estado AS estado_operacion, op.moneda, cp.serie, cp.numero,
                   a.numero_asiento, a.piso, v.fecha_salida, v.hora_salida, v.estado_viaje,
                   uo.nombre AS origen, ud.nombre AS destino, tb.nombre_tipo, r.duracion_estimada_min
            FROM pasaje pa
            JOIN venta ve ON ve.id_venta = pa.id_venta
            LEFT JOIN pago pg ON pg.id_venta = ve.id_venta
            LEFT JOIN operacion_pago op ON op.id_venta = ve.id_venta
            LEFT JOIN comprobante cp ON cp.id_venta = ve.id_venta
            LEFT JOIN viaje_asiento va ON va.id_viaje_asiento = pa.id_viaje_asiento
            LEFT JOIN asiento a ON a.id_asiento = va.id_asiento
            LEFT JOIN viaje v ON v.id_viaje = va.id_viaje
            LEFT JOIN programacion_viaje pv ON pv.id_programacion = v.id_programacion
            LEFT JOIN ruta r ON r.id_ruta = pv.id_ruta
            LEFT JOIN agencia ao ON ao.id_agencia = r.id_agencia_origen
            LEFT JOIN ubicacion uo ON uo.id_ubicacion = ao.id_ubicacion
            LEFT JOIN agencia ad ON ad.id_agencia = r.id_agencia_destino
            LEFT JOIN ubicacion ud ON ud.id_ubicacion = ad.id_ubicacion
            LEFT JOIN bus b ON b.id_bus = v.id_bus
            LEFT JOIN tipo_bus tb ON tb.id_tipo_bus = b.id_tipo_bus
            WHERE pa.id_pasajero = :idPasajero
            ORDER BY v.fecha_salida DESC, v.hora_salida DESC, pa.id_pasaje DESC
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public ClientesRepositorio(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Trae una página de pasajeros que cumplen el filtro. */
    public List<ClienteResumenDto> listar(FiltroClientes filtro, LocalDateTime ahora) {
        Map<String, Object> parametros = new HashMap<>();
        String donde = condiciones(filtro, parametros);
        parametros.put("ahora", ahora);
        parametros.put("limite", filtro.limite());
        parametros.put("desplazamiento", filtro.desplazamiento());
        String sql = "SELECT * FROM (" + BASE.formatted(VIAJES_CONFIRMADOS, donde) + ") b WHERE "
                + filtroActividad(filtro.actividad()) + " ORDER BY " + ordenamiento(filtro)
                + " LIMIT :limite OFFSET :desplazamiento";
        return jdbc.query(sql, parametros, (rs, fila) -> new ClienteResumenDto(
                rs.getInt("id_pasajero"), rs.getString("tipo_documento"), rs.getString("numero_documento"),
                rs.getString("nombres"), rs.getString("apellidos"), rs.getString("nro_telefono"),
                rs.getInt("viajes"), rs.getObject("ultimo_viaje", LocalDateTime.class),
                rs.getObject("proximo_viaje", LocalDateTime.class)));
    }

    /** Cuenta cuántos pasajeros cumplen el mismo filtro (sirve para saber cuántas páginas hay). */
    public long contar(FiltroClientes filtro, LocalDateTime ahora) {
        Map<String, Object> parametros = new HashMap<>();
        String donde = condiciones(filtro, parametros);
        parametros.put("ahora", ahora);
        String sql = "SELECT COUNT(*) FROM (" + BASE.formatted(VIAJES_CONFIRMADOS, donde) + ") b WHERE "
                + filtroActividad(filtro.actividad());
        Long total = jdbc.queryForObject(sql, parametros, Long.class);
        return total == null ? 0 : total;
    }

    /**
     * Totales del panel: pasajeros, pasajeros con viajes próximos, con viajes realizados y pasajes confirmados.
     */
    public IndicadoresClientesDto indicadores(LocalDateTime ahora) {
        Map<String, Object> parametros = Map.of("ahora", ahora);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM pasajero", parametros, Long.class);
        String sql = "SELECT COUNT(DISTINCT CASE WHEN vp.salida > :ahora THEN vp.id_pasajero END) AS proximos, "
                + "COUNT(DISTINCT CASE WHEN vp.salida <= :ahora THEN vp.id_pasajero END) AS realizados, "
                + "COUNT(vp.id_pasaje) AS pasajes FROM (" + VIAJES_CONFIRMADOS + ") vp";
        long[] agregados = jdbc.queryForObject(sql, parametros, (rs, fila) ->
                new long[] {rs.getLong("proximos"), rs.getLong("realizados"), rs.getLong("pasajes")});
        List<String> tipos = jdbc.queryForList(
                "SELECT DISTINCT tipo_documento FROM pasajero WHERE tipo_documento IS NOT NULL ORDER BY tipo_documento",
                parametros, String.class);
        return new IndicadoresClientesDto(total == null ? 0 : total, agregados[0], agregados[1], agregados[2], tipos);
    }

    /** Datos de un pasajero más las fechas de su primer, último y próximo viaje. Vacío si no existe. */
    public Optional<DatosPasajero> buscarPasajero(int idPasajero, LocalDateTime ahora) {
        String sql = """
                SELECT pj.id_pasajero, pj.tipo_documento, pj.numero_documento, pj.nombres, pj.apellidos,
                       pj.nro_telefono, pj.fecha_nacimiento, pj.fecha_creacion,
                       COUNT(vp.id_pasaje) AS viajes, MIN(vp.salida) AS primer_viaje,
                       MAX(CASE WHEN vp.salida <= :ahora THEN vp.salida END) AS ultimo_viaje,
                       MIN(CASE WHEN vp.salida > :ahora THEN vp.salida END) AS proximo_viaje
                FROM pasajero pj
                LEFT JOIN (%s) vp ON vp.id_pasajero = pj.id_pasajero
                WHERE pj.id_pasajero = :idPasajero
                GROUP BY pj.id_pasajero, pj.tipo_documento, pj.numero_documento, pj.nombres, pj.apellidos,
                         pj.nro_telefono, pj.fecha_nacimiento, pj.fecha_creacion
                """.formatted(VIAJES_CONFIRMADOS);
        List<DatosPasajero> filas = jdbc.query(sql, Map.of("idPasajero", idPasajero, "ahora", ahora),
                (rs, fila) -> new DatosPasajero(
                        rs.getInt("id_pasajero"), rs.getString("tipo_documento"), rs.getString("numero_documento"),
                        rs.getString("nombres"), rs.getString("apellidos"), rs.getString("nro_telefono"),
                        rs.getObject("fecha_nacimiento", LocalDate.class),
                        rs.getObject("fecha_creacion", LocalDateTime.class), rs.getInt("viajes"),
                        rs.getObject("primer_viaje", LocalDateTime.class),
                        rs.getObject("ultimo_viaje", LocalDateTime.class),
                        rs.getObject("proximo_viaje", LocalDateTime.class)));
        return filas.stream().findFirst();
    }

    /** Todos los pasajes del pasajero, del más reciente al más antiguo. */
    public List<FilaHistorial> historial(int idPasajero) {
        return jdbc.query(HISTORIAL, Map.of("idPasajero", idPasajero), ClientesRepositorio::mapearHistorial);
    }

    private static FilaHistorial mapearHistorial(ResultSet rs, int fila) throws SQLException {
        return new FilaHistorial(
                rs.getInt("id_pasaje"), rs.getObject("precio_pasaje", BigDecimal.class), rs.getInt("id_venta"),
                rs.getString("estado_venta"), rs.getString("estado_pago"), rs.getString("estado_operacion"),
                rs.getString("moneda"), rs.getString("serie"), rs.getString("numero"),
                rs.getString("numero_asiento"), rs.getObject("piso", Short.class),
                rs.getObject("fecha_salida", LocalDate.class), rs.getObject("hora_salida", LocalTime.class),
                rs.getString("estado_viaje"), rs.getString("origen"), rs.getString("destino"),
                rs.getString("nombre_tipo"), rs.getObject("duracion_estimada_min", Integer.class));
    }

    private static String condiciones(FiltroClientes filtro, Map<String, Object> parametros) {
        List<String> condiciones = new ArrayList<>();
        condiciones.add("TRUE");
        for (int i = 0; i < filtro.terminos().size(); i++) {
            condiciones.add("(" + NOMBRE_NORMALIZADO + " LIKE :termino" + i + " ESCAPE '\\' OR LOWER(pj.numero_documento) LIKE :termino"
                    + i + " ESCAPE '\\')");
            parametros.put("termino" + i, "%" + escapar(filtro.terminos().get(i)) + "%");
        }
        if (filtro.tipoDocumento() != null && !filtro.tipoDocumento().isBlank()) {
            condiciones.add("UPPER(pj.tipo_documento) = :tipoDocumento");
            parametros.put("tipoDocumento", filtro.tipoDocumento().trim().toUpperCase());
        }
        return String.join(" AND ", condiciones);
    }

    private static String filtroActividad(String actividad) {
        if ("proximos".equals(actividad)) {
            return "b.proximo_viaje IS NOT NULL";
        }
        if ("realizados".equals(actividad)) {
            return "b.ultimo_viaje IS NOT NULL";
        }
        if ("sin-viajes".equals(actividad)) {
            return "b.viajes = 0";
        }
        return "TRUE";
    }

    private static String ordenamiento(FiltroClientes filtro) {
        String sentido = filtro.ascendente() ? "ASC" : "DESC";
        String principal = switch (filtro.orden()) {
            case "documento" -> "b.numero_documento " + sentido;
            case "viajes" -> "b.viajes " + sentido;
            case "ultimo" -> "b.ultimo_viaje " + sentido + " NULLS LAST";
            case "proximo" -> "b.proximo_viaje " + sentido + " NULLS LAST";
            default -> "b.apellidos " + sentido + ", b.nombres " + sentido;
        };
        return principal + ", b.id_pasajero ASC";
    }

    private static String escapar(String valor) {
        return valor.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
