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
 * Entidad JPA que representa un bus físico registrado en la base de
 * datos (tabla "bus"). Cada bus pertenece a un tipo de bus (tipo_bus)
 * y tiene una capacidad de asientos definida.
 */
@Entity
@Table(name = "bus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bus")
    private Integer idBus;

    @Column(name = "id_tipo_bus", nullable = false)
    private Integer idTipoBus;

    @Column(name = "placa", nullable = false, length = 10)
    private String placa;

    @Column(name = "numero_interno", nullable = false, length = 20)
    private String numeroInterno;

    @Column(name = "capacidad_asientos", nullable = false)
    private Short capacidadAsientos;

    @Column(name = "activo", nullable = false)
    private Boolean activo;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;
}