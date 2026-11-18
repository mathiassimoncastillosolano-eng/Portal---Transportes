package com.transportes.usuarios.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Entidad JPA de la tabla usuario: una cuenta. La usan el registro, el login, el perfil y los empleados del
 * Sistema Empresarial.
 */
@Entity
@Table(name = "usuario", schema = "public")
@Getter
@Setter
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "nombres", nullable = false, length = 100)
    private String nombres;

    @Column(name = "apellidos", nullable = false, length = 100)
    private String apellidos;

    @Column(name = "correo", nullable = false, unique = true, length = 150)
    private String correo;

    /** Hash BCrypt de la contraseña. Es null en cuentas creadas solo con Google. */
    @Column(name = "contrasena_hash", length = 255)
    private String contrasenaHash;

    /** Id fijo que da Google ("sub"); null si la cuenta no usa Google. */
    @Column(name = "google_id", length = 255, unique = true)
    private String googleId;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false, insertable = false)
    private LocalDateTime fechaActualizacion;

    @Column(name = "nro_telefono", length = 20)
    private String nroTelefono;

    /** true si la cuenta está activa. */
    public boolean estaActivo() {
        return Boolean.TRUE.equals(activo);
    }
}
