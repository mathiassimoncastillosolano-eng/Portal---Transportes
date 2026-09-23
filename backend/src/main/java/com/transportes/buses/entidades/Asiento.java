package com.transportes.buses.entidades;

import java.time.LocalDateTime;

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

/**
 * Entidad JPA que representa un asiento físico de un bus (tabla
 * "asiento"). El estado real de ocupación de un asiento NO vive aquí
 * — vive en viaje_asiento, porque un mismo asiento físico cambia de
 * estado según el viaje. Esta entidad solo describe su posición.
 */
@Entity
@Table(name = "asiento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Asiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asiento")
    private Integer idAsiento;

    @Column(name = "id_bus", nullable = false)
    private Integer idBus;

    @Column(name = "numero_asiento", nullable = false, length = 5)
    private String numeroAsiento;

    @Column(name = "piso", nullable = false)
    private Short piso;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;
}