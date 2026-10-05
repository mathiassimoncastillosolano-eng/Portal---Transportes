package com.transportes.viajes.entidades;

import java.math.BigDecimal;
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

@Entity
@Table(name = "viaje_asiento")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ViajeAsiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_viaje_asiento")
    private Integer idViajeAsiento;

    @Column(name = "id_viaje", nullable = false)
    private Integer idViaje;

    @Column(name = "id_asiento", nullable = false)
    private Integer idAsiento;

    @Column(name = "estado_viaje_asiento", nullable = false, length = 30)
    private String estadoViajeAsiento;

    @Column(name = "precio", nullable = false)
    private BigDecimal precio;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    // --- Columnas de la Tarea 3 (bloqueo temporal) ---

    @Column(name = "fecha_expiracion_bloqueo")
    private LocalDateTime fechaExpiracionBloqueo;

    @Column(name = "token_bloqueo", length = 100)
    private String tokenBloqueo;

    @Column(name = "id_pasajero")
    private Integer idPasajero;
}