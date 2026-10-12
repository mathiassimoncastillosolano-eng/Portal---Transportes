package com.transportes;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import com.transportes.viajes.reglas.PoliticaReservaViaje;

/**
 * Reloj de negocio controlable para las pruebas de integración: por defecto marca la hora real; con
 * {@link RelojPrueba#fijar(LocalDateTime)} se congela en una hora local de Perú. Se importa con
 * {@code @Import(RelojPruebaConfiguracion.class)} y se inyecta con {@code @Autowired RelojPrueba reloj}.
 * Cada prueba debe llamar a {@code reloj.liberar()} antes de empezar (en su {@code @BeforeEach}).
 */
@TestConfiguration
public class RelojPruebaConfiguracion {

    public static class RelojPrueba extends Clock {
        private volatile Instant fijo;

        public void fijar(LocalDateTime horaLima) {
            this.fijo = horaLima.atZone(PoliticaReservaViaje.ZONA_NEGOCIO).toInstant();
        }

        public void liberar() {
            this.fijo = null;
        }

        @Override
        public ZoneId getZone() {
            return PoliticaReservaViaje.ZONA_NEGOCIO;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return Clock.system(zona);
        }

        @Override
        public Instant instant() {
            Instant actual = fijo;
            return actual != null ? actual : Instant.now();
        }
    }

    @Bean
    @Primary
    public RelojPrueba relojPrueba() {
        return new RelojPrueba();
    }
}
