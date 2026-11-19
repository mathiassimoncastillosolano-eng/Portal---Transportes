package com.transportes.pagos.entidades;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Intento de pago (tabla operacion_pago). */
@Entity
@Table(name = "operacion_pago")
@Getter
@Setter
@NoArgsConstructor
public class OperacionPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_operacion_pago")
    private Integer idOperacionPago;

    @Column(name = "referencia_externa", nullable = false, length = 64)
    private String referenciaExterna;

    @Column(name = "clave_idempotencia", nullable = false, length = 64)
    private String claveIdempotencia;

    @Column(name = "id_viaje", nullable = false)
    private Long idViaje;

    @Column(name = "id_sesion_reserva", nullable = false, length = 100)
    private String idSesionReserva;

    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "medio_pago", nullable = false, length = 20)
    private String medioPago;

    /**
     * Entorno con que se creó el cargo. No cambia: define qué credenciales se usan para consultar y reembolsar.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "entorno", nullable = false, length = 12)
    private EntornoPago entorno;

    @Column(name = "monto", nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(name = "moneda", nullable = false, length = 3)
    private String moneda;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 30)
    private EstadoOperacion estado;

    @Column(name = "culqi_charge_id", length = 64)
    private String culqiChargeId;

    @Column(name = "culqi_estado", length = 40)
    private String culqiEstado;

    @Column(name = "culqi_codigo", length = 60)
    private String culqiCodigo;

    @Column(name = "culqi_refund_id", length = 64)
    private String culqiRefundId;

    @Column(name = "email_pagador", length = 150)
    private String emailPagador;

    @Column(name = "terminos_aceptados_en")
    private LocalDateTime terminosAceptadosEn;

    @Column(name = "terminos_version", length = 20)
    private String terminosVersion;

    /** Copia temporal en JSON de los pasajeros; se borra al cerrar la operación. */
    @Column(name = "datos_pasajeros")
    private String datosPasajeros;

    @Column(name = "id_venta")
    private Integer idVenta;

    @Column(name = "mensaje", length = 255)
    private String mensaje;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;

    @Column(name = "fecha_ultima_consulta")
    private LocalDateTime fechaUltimaConsulta;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;
}
