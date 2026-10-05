package com.transportes.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo esperado por {@code POST /api/auth/google} y
 * {@code POST /api/auth/google/vincular}: el ID token (JWT) que Google
 * entrega al frontend en el campo {@code credential}.
 */
public class GoogleLoginRequest {

    @NotBlank(message = "La credencial de Google es obligatoria.")
    @Size(max = 4096, message = "La credencial de Google no es valida.")
    private String credential;

    public String getCredential() {
        return credential;
    }

    public void setCredential(String credential) {
        this.credential = credential;
    }
}
