package com.transportes.viajes.entidades;

import com.transportes.servicios.entidades.ServicioBus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "tipo_bus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class TipoBus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_bus")
    @EqualsAndHashCode.Include
    @ToString.Include
    private Integer idTipoBus;

    @Column(name = "nombre_tipo", nullable = false, length = 50)
    @ToString.Include
    private String nombreTipo;

    @Column(name = "descripcion", length = 200)
    private String descripcion;

    @Column(name = "url_imagen", columnDefinition = "TEXT")
    private String urlImagen;

    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /**
     * Amenidades de este tipo de bus (WiFi, Baño, TV, etc.), a través de
     * la tabla intermedia existente {@code tipo_bus_servicio}. Se listan
     * dinámicamente desde la BD: si mañana se agrega un nuevo servicio_bus
     * asociado aquí aparece automáticamente
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "tipo_bus_servicio",
            joinColumns = @JoinColumn(name = "id_tipo_bus",
                    foreignKey = @ForeignKey(name = "fk_tbs_tipo_bus")),
            inverseJoinColumns = @JoinColumn(name = "id_servicio_bus",
                    foreignKey = @ForeignKey(name = "fk_tbs_servicio_bus"))
    )
    private Set<ServicioBus> servicios;
}
