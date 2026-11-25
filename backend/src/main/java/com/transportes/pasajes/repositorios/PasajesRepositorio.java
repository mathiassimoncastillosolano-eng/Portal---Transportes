package com.transportes.pasajes.repositorios;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PasajesRepositorio {

    public record FiltroPasajes(List<String> terminos, Integer idPasajero, String origen, String destino,
            LocalDate desde, LocalDate hasta, String estado, String fase, String orden, boolean ascendente,
            int limite, int desplazamiento) {
    }

    public record FilaPasaje(
            int idPasaje, int idPasajero, String tipoDocumento, String numeroDocumento, String nombres,
            String apellidos, BigDecimal precio, int idVenta, String estado, String fase, String moneda,
            String serie, String numero, String asiento, Short piso, LocalDate fechaSalida, LocalTime horaSalida,
            String origen, String destino, String tipoBus, Integer duracionMin, boolean cambiado) {
    }

    public record Totales(long total, long confirmados, long proximos, BigDecimal ingresos) {
    }

    private static final String NOMBRE_NORMALIZADO =
            "TRANSLATE(LOWER(b.nombres || ' ' || b.apellidos), 'áéíóúüñ', 'aeiouun')";

    private static final String BASE = """
            SELECT pa.id_pasaje, pa.id_pasajero, pj.tipo_documento, pj.numero_documento, pj.nombres, pj.apellidos,
                   pa.precio + COALESCE((SELECT SUM(po.importe_adicional) FROM postergacion po
                                         WHERE po.id_pasaje = pa.id_pasaje), 0) AS precio,
                   ve.id_venta, op.moneda, cp.serie, cp.numero, a.numero_asiento, a.piso,
                   v.fecha_salida, v.hora_salida, uo.nombre AS origen, ud.nombre AS destino,
                   tb.nombre_tipo, r.duracion_estimada_min,
                   EXISTS (SELECT 1 FROM postergacion po WHERE po.id_pasaje = pa.id_pasaje) AS cambiado,
                   CASE WHEN UPPER(TRIM(COALESCE(op.estado, ''))) = 'REEMBOLSADO' THEN 'REEMBOLSADA'
                        WHEN UPPER(TRIM(COALESCE(ve.estado_venta, ''))) = 'PAGADA'
                             AND UPPER(TRIM(COALESCE(pg.estado_pago, ''))) = 'APROBADO' THEN 'CONFIRMADA'
                        ELSE 'SIN_CONFIRMAR' END AS estado,
                   CASE WHEN v.estado_viaje IS NULL OR v.fecha_salida IS NULL OR v.hora_salida IS NULL
                             THEN 'SIN_INFORMACION'
                        WHEN UPPER(TRIM(v.estado_viaje)) <> 'PROGRAMADO' THEN 'NO_REALIZADO'
                        WHEN (v.fecha_salida + v.hora_salida) > :ahora THEN 'PROXIMO'
                        ELSE 'REALIZADO' END AS fase
            FROM pasaje pa
            JOIN pasajero pj ON pj.id_pasajero = pa.id_pasajero
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
            LEFT JOIN bus bu ON bu.id_bus = v.id_bus
            LEFT JOIN tipo_bus tb ON tb.id_tipo_bus = bu.id_tipo_bus
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PasajesRepositorio(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<FilaPasaje> listar(FiltroPasajes filtro, LocalDateTime ahora) {
        Map<String, Object> parametros = new HashMap<>();
        String donde = condiciones(filtro, parametros);
        parametros.put("ahora", ahora);
        parametros.put("limite", filtro.limite());
        parametros.put("desplazamiento", filtro.desplazamiento());
        String sql = "SELECT * FROM (" + BASE + ") b WHERE " + donde + " ORDER BY " + ordenamiento(filtro)
                + " LIMIT :limite OFFSET :desplazamiento";
        return jdbc.query(sql, parametros, PasajesRepositorio::mapear);
    }

    public Totales totales(FiltroPasajes filtro, LocalDateTime ahora) {
        Map<String, Object> parametros = new HashMap<>();
        String donde = condiciones(filtro, parametros);
        parametros.put("ahora", ahora);
        String sql = """
                SELECT COUNT(*) AS total,
                       COUNT(CASE WHEN b.estado = 'CONFIRMADA' THEN 1 END) AS confirmados,
                       COUNT(CASE WHEN b.estado = 'CONFIRMADA' AND b.fase = 'PROXIMO' THEN 1 END) AS proximos,
                       COALESCE(SUM(CASE WHEN b.estado = 'CONFIRMADA' THEN b.precio END), 0) AS ingresos
                FROM (%s) b WHERE %s
                """.formatted(BASE, donde);
        return jdbc.queryForObject(sql, parametros, (rs, fila) -> new Totales(rs.getLong("total"),
                rs.getLong("confirmados"), rs.getLong("proximos"), rs.getBigDecimal("ingresos")));
    }

    public List<String> origenes(LocalDateTime ahora) {
        return distintos("origen", ahora);
    }

    public List<String> destinos(LocalDateTime ahora) {
        return distintos("destino", ahora);
    }

    private List<String> distintos(String columna, LocalDateTime ahora) {
        String sql = "SELECT DISTINCT b." + columna + " FROM (" + BASE + ") b WHERE b." + columna
                + " IS NOT NULL ORDER BY b." + columna;
        return jdbc.queryForList(sql, Map.of("ahora", ahora), String.class);
    }

    private static FilaPasaje mapear(ResultSet rs, int fila) throws SQLException {
        return new FilaPasaje(
                rs.getInt("id_pasaje"), rs.getInt("id_pasajero"), rs.getString("tipo_documento"),
                rs.getString("numero_documento"), rs.getString("nombres"), rs.getString("apellidos"),
                rs.getBigDecimal("precio"), rs.getInt("id_venta"), rs.getString("estado"), rs.getString("fase"),
                rs.getString("moneda"), rs.getString("serie"), rs.getString("numero"),
                rs.getString("numero_asiento"), rs.getObject("piso", Short.class),
                rs.getObject("fecha_salida", LocalDate.class), rs.getObject("hora_salida", LocalTime.class),
                rs.getString("origen"), rs.getString("destino"), rs.getString("nombre_tipo"),
                rs.getObject("duracion_estimada_min", Integer.class), rs.getBoolean("cambiado"));
    }

    private static String condiciones(FiltroPasajes filtro, Map<String, Object> parametros) {
        List<String> condiciones = new ArrayList<>();
        condiciones.add("TRUE");
        for (int i = 0; i < filtro.terminos().size(); i++) {
            condiciones.add("(" + NOMBRE_NORMALIZADO + " LIKE :termino" + i + " ESCAPE '\\' OR LOWER(b.numero_documento) LIKE :termino"
                    + i + " ESCAPE '\\' OR LOWER(b.serie || '-' || b.numero) LIKE :termino" + i + " ESCAPE '\\')");
            parametros.put("termino" + i, "%" + escapar(filtro.terminos().get(i)) + "%");
        }
        if (filtro.idPasajero() != null) {
            condiciones.add("b.id_pasajero = :idPasajero");
            parametros.put("idPasajero", filtro.idPasajero());
        }
        if (filtro.origen() != null) {
            condiciones.add("LOWER(b.origen) = :origen");
            parametros.put("origen", filtro.origen().toLowerCase());
        }
        if (filtro.destino() != null) {
            condiciones.add("LOWER(b.destino) = :destino");
            parametros.put("destino", filtro.destino().toLowerCase());
        }
        if (filtro.desde() != null) {
            condiciones.add("b.fecha_salida >= :desde");
            parametros.put("desde", filtro.desde());
        }
        if (filtro.hasta() != null) {
            condiciones.add("b.fecha_salida <= :hasta");
            parametros.put("hasta", filtro.hasta());
        }
        if (filtro.estado() != null) {
            condiciones.add("b.estado = :estado");
            parametros.put("estado", filtro.estado());
        }
        if ("OTROS".equals(filtro.fase())) {
            condiciones.add("b.fase IN ('NO_REALIZADO', 'SIN_INFORMACION')");
        } else if (filtro.fase() != null) {
            condiciones.add("b.fase = :fase");
            parametros.put("fase", filtro.fase());
        }
        return String.join(" AND ", condiciones);
    }

    private static String ordenamiento(FiltroPasajes filtro) {
        String sentido = filtro.ascendente() ? "ASC" : "DESC";
        String principal = switch (filtro.orden()) {
            case "precio" -> "b.precio " + sentido;
            case "pasajero" -> "b.apellidos " + sentido + ", b.nombres " + sentido;
            default -> "b.fecha_salida " + sentido + " NULLS LAST, b.hora_salida " + sentido + " NULLS LAST";
        };
        return principal + ", b.id_pasaje DESC";
    }

    private static String escapar(String valor) {
        return valor.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
