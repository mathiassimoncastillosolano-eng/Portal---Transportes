package com.transportes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Clase que arranca el backend (Spring Boot). @EnableScheduling activa las tareas programadas (@Scheduled):
 * liberar asientos vencidos, revisar pagos pendientes y limpiar datos temporales.
 */
@SpringBootApplication
@EnableScheduling 
public class BackendApplication {

	/** Arranca el servidor web y crea todos los @Component, @Service y @RestController. */
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}