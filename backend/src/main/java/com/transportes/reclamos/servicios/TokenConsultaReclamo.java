package com.transportes.reclamos.servicios;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TokenConsultaReclamo {

    private static final String ALGORITMO = "HmacSHA256";

    private final byte[] secreto;

    public TokenConsultaReclamo(@Value("${reclamos.secreto:}") String secreto) {
        if (secreto == null || secreto.strip().length() < 32) {
            throw new IllegalStateException("reclamos.secreto debe tener al menos 32 caracteres");
        }
        this.secreto = secreto.strip().getBytes(StandardCharsets.UTF_8);
    }

    public String generar(String codigo) {
        try {
            Mac mac = Mac.getInstance(ALGORITMO);
            mac.init(new SecretKeySpec(secreto, ALGORITMO));
            byte[] firma = mac.doFinal(("reclamo:" + codigo).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(firma);
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo calcular el token de consulta", e);
        }
    }

    public boolean esValido(String codigo, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                generar(codigo).getBytes(StandardCharsets.UTF_8), token.strip().getBytes(StandardCharsets.UTF_8));
    }
}
