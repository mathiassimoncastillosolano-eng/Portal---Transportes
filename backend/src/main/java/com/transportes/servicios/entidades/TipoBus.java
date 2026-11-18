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

/** Tipo de bus (tabla tipo_bus). */
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
