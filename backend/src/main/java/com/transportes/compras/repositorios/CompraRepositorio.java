package com.transportes.compras.repositorios;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.dto.FilaResumen;
import com.transportes.compras.dto.ViajeFila;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Consultas a la base para leer las compras de un usuario. */
@Repository
public class CompraRepositorio {

    private static final String SELECT_COMPRAS = """
            SELECT ve.id_venta, ve.estado_venta, ve.monto_total, ve.fecha_venta,
                   pg.id_pago, pg.estado_pago, op.estado AS estado_operacion, op.moneda,
                   cp.serie AS comprobante_serie, cp.numero AS comprobante_numero, cp.tipo_comprobante,
                   p.id_pasaje, p.precio AS precio_pasaje,
                   COALESCE((SELECT SUM(po.importe_adicional) FROM postergacion po
                             WHERE po.id_pasaje = p.id_pasaje), 0) AS adicional_pagado,
                   pj.tipo_documento, pj.numero_documento, pj.nombres, pj.apellidos,
                   a.numero_asiento, a.piso,
                   v.id_viaje, v.fecha_salida, v.hora_salida, v.estado_viaje,
                   uo.nombre AS origen, ud.nombre AS destino, tb.nombre_tipo, r.duracion_estimada_min AS duracion_min,
                   pu.fecha_postergacion AS fecha_cambio, a_ant.numero_asiento AS ant_numero_asiento,
            """ + columnasViaje("_ant", "ant") + "," + columnasViaje("_orig", "orig") + """
            FROM venta ve
            LEFT JOIN pago pg ON pg.id_venta = ve.id_venta
            LEFT JOIN operacion_pago op ON op.id_venta = ve.id_venta
            LEFT JOIN comprobante cp ON cp.id_venta = ve.id_venta
            LEFT JOIN pasaje p ON p.id_venta = ve.id_venta
            LEFT JOIN pasajero pj ON pj.id_pasajero = p.id_pasajero
            LEFT JOIN viaje_asiento va ON va.id_viaje_asiento = p.id_viaje_asiento
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
            LEFT JOIN postergacion pu ON pu.id_postergacion = (
                SELECT MAX(x.id_postergacion) FROM postergacion x WHERE x.id_pasaje = p.id_pasaje)
            LEFT JOIN postergacion pp ON pp.id_postergacion = (
                SELECT MIN(x.id_postergacion) FROM postergacion x WHERE x.id_pasaje = p.id_pasaje)
            LEFT JOIN viaje_asiento va_ant ON va_ant.id_viaje_asiento = pu.id_viaje_asiento_anterior
            LEFT JOIN asiento a_ant ON a_ant.id_asiento = va_ant.id_asiento
            """ + unirViaje("_ant", "pu.id_viaje_anterior") + unirViaje("_orig", "pp.id_viaje_anterior") + """
            WHERE ve.id_usuario = :idUsuario
            """;

    /* Une los cambios de viaje del pasaje: el último y el primero. */

    /**
     * Columnas de un viaje unido con unirViaje: id, fecha, hora, estado, origen, destino, tipo de bus y duración
     * de la ruta.
     */
    private static String columnasViaje(String sufijo, String prefijo) {
        return """
                   v%1$s.id_viaje AS %2$s_id_viaje, v%1$s.fecha_salida AS %2$s_fecha_salida,
                   v%1$s.hora_salida AS %2$s_hora_salida, v%1$s.estado_viaje AS %2$s_estado_viaje,
                   uo%1$s.nombre AS %2$s_origen, ud%1$s.nombre AS %2$s_destino, tb%1$s.nombre_tipo AS %2$s_tipo_bus,
                   r%1$s.duracion_estimada_min AS %2$s_duracion_min
            """.formatted(sufijo, prefijo);
    }

    /** Texto SQL que une un viaje (con su ruta y su tipo de bus) a partir de la columna que guarda su id. */
    private static String unirViaje(String sufijo, String columnaIdViaje) {
        return """
            LEFT JOIN viaje v%1$s ON v%1$s.id_viaje = %2$s
            LEFT JOIN programacion_viaje pv%1$s ON pv%1$s.id_programacion = v%1$s.id_programacion
            LEFT JOIN ruta r%1$s ON r%1$s.id_ruta = pv%1$s.id_ruta
            LEFT JOIN agencia ao%1$s ON ao%1$s.id_agencia = r%1$s.id_agencia_origen
            LEFT JOIN ubicacion uo%1$s ON uo%1$s.id_ubicacion = ao%1$s.id_ubicacion
            LEFT JOIN agencia ad%1$s ON ad%1$s.id_agencia = r%1$s.id_agencia_destino
            LEFT JOIN ubicacion ud%1$s ON ud%1$s.id_ubicacion = ad%1$s.id_ubicacion
            LEFT JOIN bus b%1$s ON b%1$s.id_bus = v%1$s.id_bus
            LEFT JOIN tipo_bus tb%1$s ON tb%1$s.id_tipo_bus = b%1$s.id_tipo_bus
            """.formatted(sufijo, columnaIdViaje);
    }

    private static final String ORDEN_COMPRAS = " ORDER BY ve.id_venta DESC, p.id_pasaje";

    private static final String SELECT_RESUMEN = """
            SELECT ve.id_venta, ve.estado_venta, pg.estado_pago, op.estado AS estado_operacion,
                   p.id_pasaje, v.id_viaje, v.fecha_salida, v.hora_salida, v.estado_viaje
            FROM venta ve
            LEFT JOIN pago pg ON pg.id_venta = ve.id_venta
            LEFT JOIN operacion_pago op ON op.id_venta = ve.id_venta
            LEFT JOIN pasaje p ON p.id_venta = ve.id_venta
            LEFT JOIN viaje_asiento va ON va.id_viaje_asiento = p.id_viaje_asiento
            LEFT JOIN viaje v ON v.id_viaje = va.id_viaje
            WHERE ve.id_usuario = :idUsuario
            ORDER BY ve.id_venta DESC, p.id_pasaje
            """;

    private static final RowMapper<FilaCompra> MAPA_COMPRA = CompraRepositorio::mapearCompra;
    private static final RowMapper<FilaResumen> MAPA_RESUMEN = CompraRepositorio::mapearResumen;

    private final NamedParameterJdbcTemplate jdbc;

    public CompraRepositorio(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Todas las compras del usuario (una fila por pasaje). */
    public List<FilaCompra> filasDelUsuario(int idUsuario) {
        return jdbc.query(SELECT_COMPRAS + ORDEN_COMPRAS, Map.of("idUsuario", idUsuario), MAPA_COMPRA);
    }

    /** Devuelve una compra solo si es del usuario. */
    public List<FilaCompra> filasDeCompra(int idUsuario, int idVenta) {
        return jdbc.query(SELECT_COMPRAS + " AND ve.id_venta = :idVenta" + ORDEN_COMPRAS,
                Map.of("idUsuario", idUsuario, "idVenta", idVenta), MAPA_COMPRA);
    }

    /** Datos mínimos para los contadores del perfil. */
    public List<FilaResumen> filasResumen(int idUsuario) {
        return jdbc.query(SELECT_RESUMEN, Map.of("idUsuario", idUsuario), MAPA_RESUMEN);
    }

    private static FilaCompra mapearCompra(ResultSet rs, int fila) throws SQLException {
        return new FilaCompra(
                rs.getInt("id_venta"), rs.getString("estado_venta"),
                rs.getObject("monto_total", BigDecimal.class), rs.getObject("fecha_venta", LocalDateTime.class),
                rs.getString("estado_pago"), rs.getString("estado_operacion"), rs.getString("moneda"),
                rs.getString("comprobante_serie"), rs.getString("comprobante_numero"),
                rs.getString("tipo_comprobante"),
                rs.getObject("id_pasaje", Integer.class), rs.getObject("precio_pasaje", BigDecimal.class),
                rs.getString("tipo_documento"), rs.getString("numero_documento"),
                rs.getString("nombres"), rs.getString("apellidos"),
                rs.getString("numero_asiento"), rs.getObject("piso", Short.class),
                rs.getObject("id_viaje", Long.class), rs.getObject("fecha_salida", LocalDate.class),
                rs.getObject("hora_salida", LocalTime.class), rs.getString("estado_viaje"),
                rs.getString("origen"), rs.getString("destino"), rs.getString("nombre_tipo"),
                rs.getObject("adicional_pagado", BigDecimal.class),
                mapearViaje(rs, "ant", rs.getString("ant_numero_asiento")),
                mapearViaje(rs, "orig", null),
                rs.getObject("fecha_cambio", LocalDateTime.class),
                rs.getObject("id_pago", Integer.class), rs.getObject("duracion_min", Integer.class));
    }

    /** Lee las columnas {prefijo}_* como un viaje, o devuelve null si el pasaje no fue cambiado. */
    private static ViajeFila mapearViaje(ResultSet rs, String prefijo, String numeroAsiento) throws SQLException {
        Long idViaje = rs.getObject(prefijo + "_id_viaje", Long.class);
        if (idViaje == null) {
            return null;
        }
        return new ViajeFila(idViaje,
                rs.getObject(prefijo + "_fecha_salida", LocalDate.class),
                rs.getObject(prefijo + "_hora_salida", LocalTime.class),
                rs.getString(prefijo + "_estado_viaje"),
                rs.getString(prefijo + "_origen"), rs.getString(prefijo + "_destino"),
                rs.getString(prefijo + "_tipo_bus"), numeroAsiento, rs.getObject(prefijo + "_duracion_min", Integer.class));
    }

    private static FilaResumen mapearResumen(ResultSet rs, int fila) throws SQLException {
        return new FilaResumen(
                rs.getInt("id_venta"), rs.getString("estado_venta"), rs.getString("estado_pago"),
                rs.getString("estado_operacion"),
                rs.getObject("id_pasaje", Integer.class), rs.getObject("id_viaje", Long.class),
                rs.getObject("fecha_salida", LocalDate.class), rs.getObject("hora_salida", LocalTime.class),
                rs.getString("estado_viaje"));
    }
}
