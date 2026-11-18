package com.transportes.empleados.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Entidad JPA de la tabla empleado. Un empleado es una cuenta de la tabla usuario (correo y contraseña) más sus
 * datos de trabajo: rol y sede (agencia).
 */
@Entity
@Table(name = "empleado", schema = "public")
@Getter
@Setter
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empleado")
    private Integer idEmpleado;

    /** Cuenta de usuario con la que inicia sesión (una cuenta = un empleado). */
    @Column(name = "id_usuario", nullable = false, unique = true)
    private Integer idUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 20)
    private RolEmpleado rol;

    /** Sede donde trabaja. Es nula para el gerente porque supervisa todas. */
    @Column(name = "id_agencia")
    private Long idAgencia;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /** Un empleado dado de baja ya no puede entrar al Sistema Empresarial. */
    public boolean estaActivo() {
        return Boolean.TRUE.equals(activo);
    }
}
