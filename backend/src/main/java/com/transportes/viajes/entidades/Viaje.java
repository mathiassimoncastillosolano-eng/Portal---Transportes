package com.transportes.viajes.entidades;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "viaje")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Viaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_viaje")
    @EqualsAndHashCode.Include
    @ToString.Include
    private Integer idViaje;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_programacion",
                foreignKey = @ForeignKey(name = "fk_viaje_programacion"))
    private ProgramacionViaje programacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_bus",
                foreignKey = @ForeignKey(name = "fk_viaje_bus"))
    private Bus bus;

    @Column(name = "estado_viaje", nullable = false, length = 30)
    @ToString.Include
    private String estadoViaje;

    @Column(name = "fecha_salida", nullable = false)
    @ToString.Include
    private LocalDate fechaSalida;

    @Column(name = "hora_salida", nullable = false)
    @ToString.Include
    private LocalTime horaSalida;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private LocalDateTime fechaActualizacion;
}
