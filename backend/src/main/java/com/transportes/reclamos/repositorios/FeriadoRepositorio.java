package com.transportes.reclamos.repositorios;

import java.sql.Date;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class FeriadoRepositorio {

    private final NamedParameterJdbcTemplate jdbc;

    public FeriadoRepositorio(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Set<LocalDate> entre(LocalDate desde, LocalDate hasta) {
        return new HashSet<>(jdbc.query(
                "SELECT fecha FROM public.feriado WHERE fecha BETWEEN :desde AND :hasta",
                Map.of("desde", Date.valueOf(desde), "hasta", Date.valueOf(hasta)),
                (rs, fila) -> rs.getDate("fecha").toLocalDate()));
    }

    public boolean hayFeriadosEnAnio(int anio) {
        Integer total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM public.feriado WHERE fecha BETWEEN :desde AND :hasta",
                Map.of("desde", Date.valueOf(LocalDate.of(anio, 1, 1)), "hasta", Date.valueOf(LocalDate.of(anio, 12, 31))),
                Integer.class);
        return total != null && total > 0;
    }
}
