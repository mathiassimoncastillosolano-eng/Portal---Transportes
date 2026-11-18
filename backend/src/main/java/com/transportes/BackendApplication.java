package com.transportes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Punto de arranque de Spring Boot. Activa las tareas programadas (@Scheduled) que usan los jobs de asientos,
 * pagos y limpieza.
 */
@SpringBootApplication
@EnableScheduling 
public class BackendApplication {

	/** Inicia el servidor (Tomcat embebido) y carga todos los @Component, @Service y @RestController. */
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}