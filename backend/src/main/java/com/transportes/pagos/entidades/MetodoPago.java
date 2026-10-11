package com.transportes.pagos.entidades;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Catálogo metodo_pago (solo lectura desde el backend). */
@Entity
@Table(name = "metodo_pago")
@Getter
@NoArgsConstructor
public class MetodoPago {

    @Id
    @Column(name = "id_metodo_pago")
    private Integer idMetodoPago;

    @Column(name = "nombre_metodo", nullable = false, length = 50)
    private String nombreMetodo;

    @Column(name = "activo", nullable = false)
    private Boolean activo;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;
}
