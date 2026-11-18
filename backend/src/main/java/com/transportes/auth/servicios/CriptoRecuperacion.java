package com.transportes.auth.servicios;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.OptionalLong;

/** Genera el código de recuperación, lo cifra para guardarlo y firma la prueba que se entrega al verificarlo. */
public final class CriptoRecuperacion {

    private static final String HMAC = "HmacSHA256";
    private static final int MINIMO_BYTES_SECRETO = 32;
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64_DEC = Base64.getUrlDecoder();
    private static final int MAX_LONGITUD_PRUEBA = 512;

    private final byte[] claveCodigo;
    private final byte[] clavePrueba;
    private final SecureRandom azar;

    public CriptoRecuperacion(String secreto) {
        this(secreto, new SecureRandom());
    }

    CriptoRecuperacion(String secreto, SecureRandom azar) {
        byte[] base = secreto == null ? new byte[0] : secreto.getBytes(StandardCharsets.UTF_8);
        if (base.length < MINIMO_BYTES_SECRETO) {
            throw new IllegalStateException("recuperacion.secreto debe tener al menos 32 caracteres");
        }
        this.claveCodigo = hmac(base, "rutalibre:recuperacion:codigo".getBytes(StandardCharsets.UTF_8));
        this.clavePrueba = hmac(base, "rutalibre:recuperacion:prueba".getBytes(StandardCharsets.UTF_8));
        this.azar = azar;
    }

    /** Código de N dígitos al azar (puede empezar con 0). */
    public String generarCodigo(int longitud) {
        StringBuilder codigo = new StringBuilder(longitud);
        for (int i = 0; i < longitud; i++) {
            codigo.append(azar.nextInt(10));
        }
        return codigo.toString();
    }

    /** HMAC-SHA256 del código, ligado al usuario (64 caracteres hexadecimales). */
    public String hashCodigo(int idUsuario, String codigo) {
        byte[] firma = hmac(claveCodigo, (idUsuario + ":" + codigo).getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(firma);
    }

    /** Compara en tiempo constante (no da pistas por lo que tarda). */
    public static boolean iguales(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    /** Firma una prueba que identifica al desafío hasta la hora de vencimiento. */
    public String emitirPrueba(long idToken, Instant expira) {
        byte[] nonce = new byte[16];
        azar.nextBytes(nonce);
        String payload = "v1." + idToken + "." + expira.getEpochSecond() + "." + B64.encodeToString(nonce);
        String cuerpo = B64.encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String firma = B64.encodeToString(hmac(clavePrueba, cuerpo.getBytes(StandardCharsets.UTF_8)));
        return cuerpo + "." + firma;
    }

    /** Devuelve el id del desafío si la prueba es auténtica y no venció; vacío en cualquier otro caso. */
    public OptionalLong validarPrueba(String prueba, Instant ahora) {
        if (prueba == null || prueba.isBlank() || prueba.length() > MAX_LONGITUD_PRUEBA) {
            return OptionalLong.empty();
        }
        String[] partes = prueba.split("\\.", -1);
        if (partes.length != 2) {
            return OptionalLong.empty();
        }
        String esperada = B64.encodeToString(hmac(clavePrueba, partes[0].getBytes(StandardCharsets.UTF_8)));
        if (!iguales(esperada, partes[1])) {
            return OptionalLong.empty();
        }
        try {
            String payload = new String(B64_DEC.decode(partes[0]), StandardCharsets.UTF_8);
            String[] campos = payload.split("\\.", -1);
            if (campos.length != 4 || !"v1".equals(campos[0])) {
                return OptionalLong.empty();
            }
            long id = Long.parseLong(campos[1]);
            long expiraEpoch = Long.parseLong(campos[2]);
            if (ahora.getEpochSecond() >= expiraEpoch) {
                return OptionalLong.empty();
            }
            return OptionalLong.of(id);
        } catch (IllegalArgumentException e) { // texto o número no válido
            return OptionalLong.empty();
        }
    }

    /** SHA-256 en hexadecimal. Se usa para no guardar correos ni IPs en claro en los limitadores. */
    public static String sha256Hex(String texto) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(texto.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private static byte[] hmac(byte[] clave, byte[] datos) {
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(new SecretKeySpec(clave, HMAC));
            return mac.doFinal(datos);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 no disponible", e);
        }
    }
}
