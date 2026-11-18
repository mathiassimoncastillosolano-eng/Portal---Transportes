package com.transportes.configuracion;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.transportes.viajes.reglas.PoliticaReservaViaje;

/**
 * Define el reloj del negocio: hora de Perú, que es la zona en que se guardan fecha_salida y hora_salida. Las
 * clases reciben este Clock en vez de llamar a LocalDateTime.now(), así no dependen de la zona del servidor y en
 * las pruebas se puede fijar una hora.
 */
@Configuration
public class ConfiguracionReloj {

    /** Reloj con zona America/Lima. Las pruebas lo reemplazan por una hora fija. */
    @Bean
    public Clock relojNegocio() {
        return Clock.system(PoliticaReservaViaje.ZONA_NEGOCIO);
    }
}
