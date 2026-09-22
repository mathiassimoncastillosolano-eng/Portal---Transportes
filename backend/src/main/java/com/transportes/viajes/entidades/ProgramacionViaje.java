package com.transportes.viajes.entidades;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

import com.transportes.destinos.entidades.Ruta;

@Entity
@Table(name = "programacion_viaje") 
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class ProgramacionViaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_programacion")
    @EqualsAndHashCode.Include
    @ToString.Include
    private Integer idProgramacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_ruta",
                foreignKey = @ForeignKey(name = "fk_programacion_ruta"))
    private Ruta ruta ;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_tipo_bus",
                foreignKey = @ForeignKey(name = "fk_programacion_tipo_bus"))
    private TipoBus tipoBus;

    @Column(name = "hora_salida", nullable = false)
    @ToString.Include
    private LocalTime horaSalida;

    @Builder.Default
    @Column(name = "activa", nullable = false)
    private Boolean activa = true;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", insertable = false, updatable = false)
    private LocalDateTime fechaActualizacion;
}
