package com.transportes.reclamos.entidades;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

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
@Table(name = "reclamo")
@Getter
@Setter
@NoArgsConstructor
public class Reclamo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reclamo")
    private Integer idReclamo;

    @Column(name = "codigo", nullable = false, length = 20, updatable = false)
    private String codigo;

    @Column(name = "clave_idempotencia", updatable = false)
    private UUID claveIdempotencia;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @Column(name = "tipo_requerimiento", nullable = false, length = 10, updatable = false)
    private String tipoRequerimiento;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;

    @Column(name = "nombres_completos", nullable = false, length = 200)
    private String nombresCompletos;

    @Column(name = "tipo_documento", nullable = false, length = 20)
    private String tipoDocumento;

    @Column(name = "numero_documento", nullable = false, length = 20)
    private String numeroDocumento;

    @Column(name = "domicilio", nullable = false, length = 250)
    private String domicilio;

    @Column(name = "telefono", nullable = false, length = 20)
    private String telefono;

    @Column(name = "correo", nullable = false, length = 150)
    private String correo;

    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "id_pasaje")
    private Integer idPasaje;

    @Column(name = "id_viaje")
    private Long idViaje;

    @Column(name = "servicio_involucrado", nullable = false, length = 100)
    private String servicioInvolucrado;

    @Column(name = "codigo_pasaje", length = 30)
    private String codigoPasaje;

    @Column(name = "codigo_viaje", length = 30)
    private String codigoViaje;

    @Column(name = "origen", length = 100)
    private String origen;

    @Column(name = "destino", length = 100)
    private String destino;

    @Column(name = "fecha_servicio")
    private LocalDate fechaServicio;

    @Column(name = "numero_asiento", length = 10)
    private String numeroAsiento;

    @Column(name = "descripcion_servicio", nullable = false, length = 300)
    private String descripcionServicio;

    @Column(name = "fecha_incidente", nullable = false)
    private LocalDate fechaIncidente;

    @Column(name = "monto_reclamado", precision = 10, scale = 2)
    private BigDecimal montoReclamado;

    @Column(name = "moneda", nullable = false, length = 3)
    private String moneda;

    @Column(name = "detalle_hechos", nullable = false, length = 2000)
    private String detalleHechos;

    @Column(name = "pedido_consumidor", nullable = false, length = 1000)
    private String pedidoConsumidor;

    @Column(name = "medio_respuesta", nullable = false, length = 20)
    private String medioRespuesta;

    @Column(name = "correo_respuesta", length = 150)
    private String correoRespuesta;

    @Column(name = "direccion_respuesta", length = 250)
    private String direccionRespuesta;

    @Column(name = "declaracion_veracidad", nullable = false)
    private boolean declaracionVeracidad;

    @Column(name = "autoriza_tratamiento_datos", nullable = false)
    private boolean autorizaTratamientoDatos;

    @Column(name = "fecha_limite_respuesta", nullable = false, updatable = false)
    private LocalDate fechaLimiteRespuesta;

    @Column(name = "fecha_atencion")
    private LocalDateTime fechaAtencion;

    @Column(name = "respuesta_empresa", length = 4000)
    private String respuestaEmpresa;

    @Column(name = "medidas_adoptadas", length = 2000)
    private String medidasAdoptadas;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;
}
