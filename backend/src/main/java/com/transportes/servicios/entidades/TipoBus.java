package com.transportes.servicios.entidades;

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
 * Entidad JPA que representa un tipo de bus registrado en la base de
 * datos (tabla "tipo_bus"). Estos tipos de bus son la fuente real de
 * las tarjetas que se muestran en la sección "Servicios" del
 * frontend.
 *
 * La estructura de la tabla no se modifica: esta entidad solo mapea
 * las columnas ya existentes (id_tipo_bus, nombre_tipo, descripcion,
 * fecha_creacion, url_imagen, descripcion_reclinacion).
 */
@Entity
@Table(name = "tipo_bus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TipoBus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_bus")
    private Integer idTipoBus;

    @Column(name = "nombre_tipo", nullable = false, length = 50)
    private String nombreTipo;

    @Column(name = "descripcion", length = 200)
    private String descripcion;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "url_imagen")
    private String urlImagen;

    @Column(name = "descripcion_reclinacion", length = 60)
    private String descripcionReclinacion;
}
