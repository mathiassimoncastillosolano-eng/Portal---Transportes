package com.transportes.compras.repositorios;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.dto.FilaResumen;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Consultas de solo lectura de las compras de un usuario. TODAS filtran por {@code venta.id_usuario}, que el
 * llamador obtiene del JWT validado: nunca se recibe un id de usuario desde el navegador. Las consultas son
 * parametrizadas (sin concatenar datos del cliente).
 *
 * <p>Relaciones (1:1 con la venta, por restricciones UNIQUE del esquema: uq_pago_venta, uq_operacion_pago_venta,
 * uq_comprobante_venta), por lo que {@code pago}, {@code operacion_pago} y {@code comprobante} no multiplican
 * filas. La única multiplicidad es la deseada: un pasaje por fila. Cada pasaje tiene un único pasajero, un único
 * viaje_asiento (uq_pasaje_viaje_asiento) y, de ahí, un único asiento y viaje.
 *
 * <p>Todos los joins son LEFT: una venta con datos incompletos igual se devuelve (y se marca incompleta) en lugar
 * de desaparecer. No se filtra por {@code activa/activo}: una compra histórica debe seguir mostrándose aunque
 * la ruta, la agencia o el bus se hayan desactivado después.
 */
@Repository
public class CompraRepositorio {

    private static final String SELECT_COMPRAS = """
            SELECT ve.id_venta, ve.estado_venta, ve.monto_total, ve.fecha_venta,
                   pg.estado_pago, op.estado AS estado_operacion, op.moneda,
                   cp.serie AS comprobante_serie, cp.numero AS comprobante_numero, cp.tipo_comprobante,
                   p.id_pasaje, p.precio AS precio_pasaje,
                   pj.tipo_documento, pj.numero_documento, pj.nombres, pj.apellidos,
                   a.numero_asiento, a.piso,
                   v.id_viaje, v.fecha_salida, v.hora_salida, v.estado_viaje,
                   uo.nombre AS origen, ud.nombre AS destino, tb.nombre_tipo
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
            WHERE ve.id_usuario = :idUsuario
            """;

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

    /**
     * Una compra concreta, SOLO si pertenece al usuario: el filtro por propietario forma parte de la consulta,
     * de modo que una venta ajena es indistinguible de una inexistente (lista vacía).
     */
    public List<FilaCompra> filasDeCompra(int idUsuario, int idVenta) {
        return jdbc.query(SELECT_COMPRAS + " AND ve.id_venta = :idVenta" + ORDEN_COMPRAS,
                Map.of("idUsuario", idUsuario, "idVenta", idVenta), MAPA_COMPRA);
    }

    /** Datos mínimos para los indicadores del perfil. */
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
                rs.getString("origen"), rs.getString("destino"), rs.getString("nombre_tipo"));
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
