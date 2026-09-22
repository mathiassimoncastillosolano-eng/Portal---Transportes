package com.transportes.servicios.entidades;

import jakarta.persistence.*;
import lombok.*;

/**
 * Representa una amenidad/servicio que puede ofrecer un tipo de bus
 * (WiFi, Baño, TV, USB, Snack, Cabina privada, etc.). La relación con
 * {@code TipoBus} vive en la tabla intermedia {@code tipo_bus_servicio}
 * y se modela como @ManyToMany desde {@code TipoBus} (ver esa entidad).
 */
@Entity
@Table(name = "servicio_bus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class ServicioBus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_servicio_bus")
    @EqualsAndHashCode.Include
    @ToString.Include
    private Integer idServicioBus;

    @Column(name = "nombre_servicio", nullable = false, length = 100)
    @ToString.Include
    private String nombreServicio;

    @Column(name = "icono", length = 100)
    private String icono;
}
