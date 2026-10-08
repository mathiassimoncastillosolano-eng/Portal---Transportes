package com.transportes.auth.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Desafio de recuperacion de contrasena (tabla {@code password_reset_tokens}).
 *
 * <p>Nunca guarda el codigo en claro: {@code token_hash} es un HMAC-SHA256 en
 * hexadecimal (64 caracteres) calculado con un secreto del servidor.</p>
 *
 * <p>Ciclo de vida: se crea con {@code fechaUso = null}; al acertar el codigo se
 * rellena {@code fechaVerificacion}; al cambiar la contrasena (o al invalidarlo)
 * se rellena {@code fechaUso}. Todas las fechas se guardan en UTC.</p>
 */
@Entity
@Table(name = "password_reset_tokens", schema = "public")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;

    @Column(name = "fecha_uso")
    private LocalDateTime fechaUso;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    /** Intentos fallidos de verificacion de este desafio. */
    @Column(name = "intentos", nullable = false)
    private Integer intentos = 0;

    /** Momento en que se acerto el codigo; habilita (por tiempo limitado) el cambio de contrasena. */
    @Column(name = "fecha_verificacion")
    private LocalDateTime fechaVerificacion;

    public Long getId() { return id; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public LocalDateTime getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(LocalDateTime fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }
    public LocalDateTime getFechaUso() { return fechaUso; }
    public void setFechaUso(LocalDateTime fechaUso) { this.fechaUso = fechaUso; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public Integer getIntentos() { return intentos; }
    public void setIntentos(Integer intentos) { this.intentos = intentos; }
    public LocalDateTime getFechaVerificacion() { return fechaVerificacion; }
    public void setFechaVerificacion(LocalDateTime fechaVerificacion) { this.fechaVerificacion = fechaVerificacion; }
}
