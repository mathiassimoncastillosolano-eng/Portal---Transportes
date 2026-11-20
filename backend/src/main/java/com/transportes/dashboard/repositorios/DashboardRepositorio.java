package com.transportes.dashboard.repositorios;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.transportes.dashboard.dto.OcupacionViajeDto;
import com.transportes.dashboard.dto.OpcionDto;

/**
 * Consultas de solo lectura para el Dashboard del gerente (patrón Repositorio: todo el SQL vive aquí).
 *
 * Una venta cuenta cuando está pagada, su pago está aprobado y no fue reembolsada (la misma regla que usa el
 * listado de pasajes del SE). La agencia de cada venta es la agencia de salida del viaje, porque la tabla venta
 * todavía no guarda en qué agencia se vendió. Las agencias se agrupan por ciudad: en la base hay ciudades con dos
 * registros de agencia (por ejemplo "Ruta Libre - Lima" y "RutaLibre Lima"), y para el gerente son la misma sede.
 */
@Repository
public class DashboardRepositorio {

    /**
     * Filtros de una consulta (patrón Objeto Parámetro: un solo objeto en vez de muchos argumentos sueltos).
     * Los filtros opcionales llegan en null cuando no se usan.
     */
    public record FiltroDashboard(LocalDate desde, LocalDate hasta, String entorno, Long idCiudadSalida, Long idTipoBus,
            String destino) {
    }

    /** Una fila de venta tal como sale de la base, antes de convertirla en DTO. */
    public record FilaVenta(long idViaje, LocalDate fecha, BigDecimal precio, Long idCiudadSalida, Long idTipoBus,
            String origen, String destino, boolean yaSalio) {
    }

    private static final String SELECT_VENTAS = """
            SELECT v.id_viaje,
                   CAST(ve.fecha_venta AS DATE) AS fecha,
                   pa.precio,
                   ao.id_ubicacion AS id_ciudad_salida,
                   bu.id_tipo_bus,
                   uo.nombre AS origen,
                   ud.nombre AS destino,
                   CASE WHEN UPPER(v.estado_viaje) = 'PROGRAMADO' AND (v.fecha_salida + v.hora_salida) <= :ahora
                        THEN TRUE ELSE FALSE END AS ya_salio
            FROM pasaje pa
            JOIN venta ve ON ve.id_venta = pa.id_venta
            JOIN pago pg ON pg.id_venta = ve.id_venta
            JOIN viaje_asiento va ON va.id_viaje_asiento = pa.id_viaje_asiento
            JOIN viaje v ON v.id_viaje = va.id_viaje
            JOIN programacion_viaje pv ON pv.id_programacion = v.id_programacion
            JOIN ruta r ON r.id_ruta = pv.id_ruta
            JOIN agencia ao ON ao.id_agencia = r.id_agencia_origen
            JOIN ubicacion uo ON uo.id_ubicacion = ao.id_ubicacion
            JOIN agencia ad ON ad.id_agencia = r.id_agencia_destino
            JOIN ubicacion ud ON ud.id_ubicacion = ad.id_ubicacion
            LEFT JOIN bus bu ON bu.id_bus = v.id_bus
            WHERE ve.entorno = :entorno
              AND UPPER(ve.estado_venta) = 'PAGADA'
              AND UPPER(pg.estado_pago) = 'APROBADO'
              AND NOT EXISTS (SELECT 1 FROM operacion_pago op
                              WHERE op.id_venta = ve.id_venta AND UPPER(op.estado) = 'REEMBOLSADO')
              AND ve.fecha_venta >= :desde
              AND ve.fecha_venta < :diaSiguienteAlHasta
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public DashboardRepositorio(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Pasajes vendidos entre las fechas del filtro (ambas inclusive) que cumplen los filtros opcionales. */
    public List<FilaVenta> ventas(FiltroDashboard filtro, LocalDateTime ahora) {
        Map<String, Object> parametros = new HashMap<>();
        parametros.put("entorno", filtro.entorno());
        parametros.put("ahora", ahora);
        // Se compara con el inicio del día siguiente para incluir todas las horas del último día.
        parametros.put("desde", filtro.desde().atStartOfDay());
        parametros.put("diaSiguienteAlHasta", filtro.hasta().plusDays(1).atStartOfDay());

        StringBuilder sql = new StringBuilder(SELECT_VENTAS);
        if (filtro.idCiudadSalida() != null) {
            sql.append(" AND ao.id_ubicacion = :idCiudadSalida");
            parametros.put("idCiudadSalida", filtro.idCiudadSalida());
        }
        if (filtro.idTipoBus() != null) {
            sql.append(" AND bu.id_tipo_bus = :idTipoBus");
            parametros.put("idTipoBus", filtro.idTipoBus());
        }
        if (filtro.destino() != null) {
            sql.append(" AND LOWER(ud.nombre) = :destino");
            parametros.put("destino", filtro.destino().toLowerCase());
        }
        sql.append(" ORDER BY ve.fecha_venta, pa.id_pasaje");
        return jdbc.query(sql.toString(), parametros, DashboardRepositorio::mapearVenta);
    }

    /**
     * Ocupación de los viajes indicados: capacidad = asientos del viaje, vendidos = asientos en estado OCUPADO.
     * Devuelve una lista vacía si no se pide ningún viaje.
     */
    public List<OcupacionViajeDto> ocupacion(Set<Long> idsViaje) {
        if (idsViaje.isEmpty()) {
            return List.of();
        }
        String sql = """
                SELECT va.id_viaje,
                       COUNT(*) AS capacidad,
                       COUNT(CASE WHEN UPPER(va.estado_viaje_asiento) = 'OCUPADO' THEN 1 END) AS vendidos
                FROM viaje_asiento va
                WHERE va.id_viaje IN (:ids)
                GROUP BY va.id_viaje
                ORDER BY va.id_viaje
                """;
        return jdbc.query(sql, Map.of("ids", idsViaje), (rs, fila) -> new OcupacionViajeDto(
                String.valueOf(rs.getLong("id_viaje")), rs.getInt("capacidad"), rs.getInt("vendidos")));
    }

    /**
     * Agencias activas agrupadas por ciudad: una opción por ciudad (su id es el de la ubicación). Así las agencias
     * duplicadas de una misma ciudad aparecen una sola vez en el filtro y en el ranking.
     */
    public List<OpcionDto> agencias() {
        String sql = """
                SELECT u.id_ubicacion, u.nombre
                FROM agencia a
                JOIN ubicacion u ON u.id_ubicacion = a.id_ubicacion
                WHERE a.activa = TRUE
                GROUP BY u.id_ubicacion, u.nombre
                ORDER BY u.nombre
                """;
        return jdbc.query(sql, Map.of(), (rs, fila) -> new OpcionDto(
                String.valueOf(rs.getLong("id_ubicacion")), "Agencia " + rs.getString("nombre"), null));
    }

    /** Tipos de bus (son los "servicios" que ve el gerente). */
    public List<OpcionDto> tiposDeBus() {
        String sql = "SELECT id_tipo_bus, nombre_tipo FROM tipo_bus ORDER BY nombre_tipo";
        return jdbc.query(sql, Map.of(), (rs, fila) -> new OpcionDto(
                String.valueOf(rs.getLong("id_tipo_bus")), rs.getString("nombre_tipo"), null));
    }

    /** Ciudades que son destino de alguna ruta. */
    public List<String> destinos() {
        String sql = """
                SELECT DISTINCT u.nombre
                FROM ruta r
                JOIN agencia a ON a.id_agencia = r.id_agencia_destino
                JOIN ubicacion u ON u.id_ubicacion = a.id_ubicacion
                ORDER BY u.nombre
                """;
        return jdbc.queryForList(sql, Map.of(), String.class);
    }

    private static FilaVenta mapearVenta(ResultSet rs, int fila) throws SQLException {
        return new FilaVenta(
                rs.getLong("id_viaje"),
                rs.getObject("fecha", LocalDate.class),
                rs.getBigDecimal("precio"),
                numeroONulo(rs, "id_ciudad_salida"),
                numeroONulo(rs, "id_tipo_bus"),
                rs.getString("origen"),
                rs.getString("destino"),
                rs.getBoolean("ya_salio"));
    }

    /**
     * Lee una columna numérica que puede venir vacía (NULL) y la devuelve como Long.
     * Se usa getLong + wasNull porque el driver de PostgreSQL no convierte una columna INTEGER
     * con getObject(..., Long.class) y lanzaría un error.
     */
    private static Long numeroONulo(ResultSet rs, String columna) throws SQLException {
        long valor = rs.getLong(columna);
        return rs.wasNull() ? null : valor;
    }
}
