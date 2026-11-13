package com.transportes;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.transportes.viajes.reglas.PoliticaReservaViaje;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		fijarZonaHorariaDeNegocio();
		SpringApplication.run(BackendApplication.class, args);
	}

	/**
	 * Las columnas de fecha (p. ej. la expiración del bloqueo de un asiento) son "timestamp sin zona": guardan la hora
	 * tal cual la calculó el servidor. Si dos servidores comparten la base de datos pero tienen zonas distintas
	 * (un PC en Lima y el despliegue en UTC), cada uno cree que los bloqueos del otro ya vencieron y los libera.
	 * Fijar la misma zona en todos los servidores evita ese cruce. Debe ejecutarse antes de arrancar Spring.
	 */
	private static void fijarZonaHorariaDeNegocio() {
		TimeZone.setDefault(TimeZone.getTimeZone(PoliticaReservaViaje.ZONA_NEGOCIO));
	}

}
