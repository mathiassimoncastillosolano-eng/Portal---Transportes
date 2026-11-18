package com.transportes.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Lo que envía el frontend al entrar o vincular con Google: el ID token que Google le dio (campo credential). */
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
