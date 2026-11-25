package com.transportes.postergacion.entidades;

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

/**
 * Registro de un cambio de pasaje (tabla postergacion): viaje y asiento anterior, nuevos, monto pagado
 * y, si el cambio se hizo desde el Sistema Empresarial, el agente que lo realizó.
 */
@Entity
@Table(name = "postergacion")
@Getter
@Setter
@NoArgsConstructor
public class Postergacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_postergacion")
    private Integer idPostergacion;

    @Column(name = "id_pasaje", nullable = false)
    private Integer idPasaje;

    @Column(name = "id_venta", nullable = false)
    private Integer idVenta;

    @Column(name = "id_viaje_anterior", nullable = false)
    private Long idViajeAnterior;

    @Column(name = "id_viaje_nuevo", nullable = false)
    private Long idViajeNuevo;

    @Column(name = "id_viaje_asiento_anterior", nullable = false)
    private Integer idViajeAsientoAnterior;

    @Column(name = "id_viaje_asiento_nuevo", nullable = false)
    private Integer idViajeAsientoNuevo;

    @Column(name = "importe_adicional", nullable = false, precision = 10, scale = 2)
    private BigDecimal importeAdicional;

    @Column(name = "referencia_pago", length = 64)
    private String referenciaPago;

    @Column(name = "fecha_postergacion", nullable = false)
    private LocalDateTime fechaPostergacion;

    @Column(name = "id_empleado")
    private Integer idEmpleado;
}
