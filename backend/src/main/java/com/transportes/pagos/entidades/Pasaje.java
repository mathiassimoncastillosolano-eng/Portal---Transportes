package com.transportes.pagos.entidades;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Tabla pasaje (esquema existente). uq_pasaje_viaje_asiento impide vender dos veces el mismo asiento del viaje. */
@Entity
@Table(name = "pasaje")
@Getter
@Setter
@NoArgsConstructor
public class Pasaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pasaje")
    private Integer idPasaje;

    @Column(name = "id_venta", nullable = false)
    private Integer idVenta;

    @Column(name = "id_pasajero", nullable = false)
    private Integer idPasajero;

    @Column(name = "id_viaje_asiento", nullable = false)
    private Integer idViajeAsiento;

    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;
}
