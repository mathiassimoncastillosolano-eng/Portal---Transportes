package com.transportes.viajes.entidades;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fila de {@code viaje_asiento}: el estado y el precio de un solo asiento en
 * un viaje concreto. De aquí sale la disponibilidad real y el precio base de la
 * tarjeta.
 */ 
@Entity
@Table(name = "viaje_asiento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class ViajeAsiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_viaje_asiento")
    @EqualsAndHashCode.Include
    @ToString.Include
    private Integer idViajeAsiento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_viaje",
                foreignKey = @ForeignKey(name = "fk_viaje_asiento_viaje"))
    private Viaje viaje;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_asiento",
                foreignKey = @ForeignKey(name = "fk_viaje_asiento_asiento"))
    private Asiento asiento;

    @Column(name = "estado_viaje_asiento", nullable = false, length = 30)
    @ToString.Include
    private String estadoViajeAsiento;

    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private LocalDateTime fechaActualizacion;
}
