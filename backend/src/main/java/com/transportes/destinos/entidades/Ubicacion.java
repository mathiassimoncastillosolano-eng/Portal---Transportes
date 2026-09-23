package com.transportes.destinos.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entidad JPA que representa una ubicación registrada en la base de datos
 * (tabla "ubicacion"). Estas ubicaciones son la fuente real de los
 * destinos que se muestran en las tarjetas de la sección "Destinos" del
 * frontend.
 */
@Entity
@Table(name = "ubicacion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Ubicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ubicacion")
    private Long idUbicacion;

    @Column(name = "nombre", nullable = false)
    private String nombre;

    @Column(name = "distrito")
    private String distrito;

    @Column(name = "provincia")
    private String provincia;

    @Column(name = "departamento")
    private String departamento;

    @Column(name = "url_imagen")
    private String urlImagen;

    @Column(name = "activa", nullable = false)
    private Boolean activa;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;
}
