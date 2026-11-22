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

@Entity
@Table(name = "auditoria_pago")
@Getter
@Setter
@NoArgsConstructor
public class AuditoriaPago {

    public static final String CONCEPTO_VENTA = "VENTA";
    public static final String CONCEPTO_CAMBIO_VIAJE = "CAMBIO_VIAJE";

    public static final String RESULTADO_APROBADO = "APROBADO";
    public static final String RESULTADO_RECHAZADO = "RECHAZADO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria_pago")
    private Integer idAuditoriaPago;

    @Column(name = "id_venta", nullable = false)
    private Integer idVenta;

    @Column(name = "concepto", nullable = false, length = 20)
    private String concepto;

    @Column(name = "id_pasaje")
    private Integer idPasaje;

    @Column(name = "id_postergacion")
    private Integer idPostergacion;

    @Column(name = "id_metodo_pago", nullable = false)
    private Integer idMetodoPago;

    @Column(name = "monto", nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(name = "resultado", nullable = false, length = 20)
    private String resultado;

    @Column(name = "numero_operacion", length = 64)
    private String numeroOperacion;

    @Column(name = "clave_idempotencia", nullable = false, length = 64)
    private String claveIdempotencia;

    @Column(name = "id_empleado", nullable = false)
    private Integer idEmpleado;

    @Column(name = "fecha_intento", nullable = false)
    private LocalDateTime fechaIntento;

    public boolean estaAprobado() {
        return RESULTADO_APROBADO.equals(resultado);
    }
}
