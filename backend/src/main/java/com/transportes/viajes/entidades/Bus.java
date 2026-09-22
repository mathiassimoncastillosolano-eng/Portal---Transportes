package com.transportes.viajes.entidades;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "bus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bus")
    @EqualsAndHashCode.Include
    @ToString.Include
    private Integer idBus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_tipo_bus",
                foreignKey = @ForeignKey(name = "fk_bus_tipo_bus"))
    private TipoBus tipoBus;

    @Column(name = "placa", nullable = false, length = 10)
    @ToString.Include
    private String placa;

    @Column(name = "numero_interno", nullable = false, length = 20)
    @ToString.Include
    private String numeroInterno;

    @Column(name = "capacidad_asientos", nullable = false)
    private Short capacidadAsientos;

    @Builder.Default
    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;
}
