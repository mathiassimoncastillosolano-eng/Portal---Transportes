package com.transportes.reclamos.repositorios;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PasajeUsuarioRepositorio {

    public record ReferenciaPasaje(
            int idPasaje, Long idViaje, String origen, String destino, LocalDate fechaSalida, String numeroAsiento) {
    }

    private static final String CONSULTA = """
            SELECT p.id_pasaje, v.id_viaje, v.fecha_salida, a.numero_asiento, uo.nombre AS origen, ud.nombre AS destino
            FROM pasaje p
            JOIN venta ve ON ve.id_venta = p.id_venta
            LEFT JOIN viaje_asiento va ON va.id_viaje_asiento = p.id_viaje_asiento
            LEFT JOIN asiento a ON a.id_asiento = va.id_asiento
            LEFT JOIN viaje v ON v.id_viaje = va.id_viaje
            LEFT JOIN programacion_viaje pv ON pv.id_programacion = v.id_programacion
            LEFT JOIN ruta r ON r.id_ruta = pv.id_ruta
            LEFT JOIN agencia ao ON ao.id_agencia = r.id_agencia_origen
            LEFT JOIN ubicacion uo ON uo.id_ubicacion = ao.id_ubicacion
            LEFT JOIN agencia ad ON ad.id_agencia = r.id_agencia_destino
            LEFT JOIN ubicacion ud ON ud.id_ubicacion = ad.id_ubicacion
            WHERE p.id_pasaje = :idPasaje AND ve.id_usuario = :idUsuario
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public PasajeUsuarioRepositorio(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ReferenciaPasaje> buscar(int idUsuario, int idPasaje) {
        List<ReferenciaPasaje> filas = jdbc.query(CONSULTA, Map.of("idUsuario", idUsuario, "idPasaje", idPasaje),
                (rs, fila) -> new ReferenciaPasaje(
                        rs.getInt("id_pasaje"), rs.getObject("id_viaje", Long.class),
                        rs.getString("origen"), rs.getString("destino"),
                        rs.getObject("fecha_salida", LocalDate.class), rs.getString("numero_asiento")));
        return filas.stream().findFirst();
    }
}
