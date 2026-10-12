package com.transportes.configuracion;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.transportes.viajes.reglas.PoliticaReservaViaje;

/**
 * Reloj de negocio: hora local de Perú, que es la zona en la que se guardan fecha_salida y hora_salida de los
 * viajes. Se inyecta (en lugar de llamar a LocalDateTime.now()) para no depender de la zona del servidor o de la
 * base de datos y para poder fijar la hora en las pruebas.
 */
@Configuration
public class ConfiguracionReloj {

    @Bean
    public Clock relojNegocio() {
        return Clock.system(PoliticaReservaViaje.ZONA_NEGOCIO);
    }
}
