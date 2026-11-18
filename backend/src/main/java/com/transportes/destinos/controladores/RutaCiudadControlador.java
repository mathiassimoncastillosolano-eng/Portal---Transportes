package com.transportes.destinos.controladores;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST de /api/rutas-ciudad: devuelve los pares origen-destino activos (tabla ruta_ciudad). El
 * buscador del Portal lo usa para ofrecer solo destinos a los que sí hay viajes desde el origen elegido.
 */
@RestController
@RequestMapping("/api/rutas-ciudad")
public class RutaCiudadControlador {

    private final JdbcTemplate jdbc;

    public RutaCiudadControlador(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Un par de ciudades: origen y destino. */
    public record RutaCiudad(String origen, String destino) {}

    /** GET /api/rutas-ciudad: consulta SQL directa; solo pares activos entre ciudades activas, ordenados por nombre. */
    @GetMapping
    public List<RutaCiudad> listar() {
        return jdbc.query("""
            SELECT o.nombre AS origen, d.nombre AS destino
            FROM public.ruta_ciudad rc
            JOIN public.ubicacion o ON o.id_ubicacion = rc.id_origen
            JOIN public.ubicacion d ON d.id_ubicacion = rc.id_destino
            WHERE rc.activa AND o.activa AND d.activa
            ORDER BY o.nombre, d.nombre
            """,
            (fila, numero) -> new RutaCiudad(
                fila.getString("origen"),
                fila.getString("destino")
            )
        );
    }
}