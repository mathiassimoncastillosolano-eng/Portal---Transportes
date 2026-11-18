package com.transportes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Clase principal: arranca el backend y activa las tareas programadas (@Scheduled). */
@SpringBootApplication
@EnableScheduling 
public class BackendApplication {

	/** Arranca el servidor web y crea todos los @Component, @Service y @RestController. */
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}