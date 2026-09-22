package com.transportes.viajes.entidades;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "asiento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Asiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asiento")
    @EqualsAndHashCode.Include
    @ToString.Include
    private Integer idAsiento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_bus",
                foreignKey = @ForeignKey(name = "fk_asiento_bus"))
    private Bus bus;

    @Column(name = "numero_asiento", nullable = false, length = 5)
    @ToString.Include
    private String numeroAsiento;

    @Column(name = "piso", nullable = false)
    private Short piso;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;
}
