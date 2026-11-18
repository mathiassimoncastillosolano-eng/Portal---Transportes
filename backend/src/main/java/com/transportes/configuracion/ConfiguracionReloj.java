package com.transportes.configuracion;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.transportes.viajes.reglas.PoliticaReservaViaje;

/** Crea el reloj con la hora de Perú que usa todo el backend. */
@Configuration
public class ConfiguracionReloj {

    /** Reloj con zona America/Lima. Las pruebas lo reemplazan por una hora fija. */
    @Bean
    public Clock relojNegocio() {
        return Clock.system(PoliticaReservaViaje.ZONA_NEGOCIO);
    }
}
