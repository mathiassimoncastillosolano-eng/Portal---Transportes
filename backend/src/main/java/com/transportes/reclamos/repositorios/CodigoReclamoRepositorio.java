package com.transportes.reclamos.repositorios;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Pide a la BD el siguiente código correlativo de reclamo. */
@Repository
public class CodigoReclamoRepositorio {

    private final JdbcTemplate jdbc;

    public CodigoReclamoRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Llama a la función SQL generar_codigo_reclamo(). */
    public String siguiente() {
        String codigo = jdbc.queryForObject("SELECT public.generar_codigo_reclamo()", String.class);
        if (codigo == null) {
            throw new IllegalStateException("La base de datos no devolvió un código de reclamo");
        }
        return codigo;
    }
}
