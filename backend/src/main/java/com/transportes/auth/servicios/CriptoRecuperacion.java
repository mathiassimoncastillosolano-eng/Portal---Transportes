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

/**
 * Primitivas criptograficas de la recuperacion de contrasena (solo JDK).
 *
 * <ul>
 *   <li>Codigo numerico generado con {@link SecureRandom}.</li>
 *   <li>Hash del codigo: HMAC-SHA256 con una clave derivada del secreto del servidor y
 *       ligada al usuario. Produce 64 caracteres hexadecimales (cabe en
 *       {@code token_hash VARCHAR(64)}). Al llevar secreto, una filtracion de la tabla no
 *       permite recuperar el codigo por fuerza bruta offline.</li>
 *   <li>Prueba de recuperacion: token firmado con HMAC (otra clave derivada) que el
 *       servidor entrega tras verificar el codigo. Solo identifica el desafio; el estado
 *       real (usado, vencido) vive en la base de datos.</li>
 * </ul>
 */
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

    /** Codigo de {@code longitud} digitos con distribucion uniforme (admite ceros a la izquierda). */
    public String generarCodigo(int longitud) {
        StringBuilder codigo = new StringBuilder(longitud);
        for (int i = 0; i < longitud; i++) {
            codigo.append(azar.nextInt(10));
        }
        return codigo.toString();
    }

    /** HMAC-SHA256 (hex, 64 caracteres) del codigo, ligado al usuario. */
    public String hashCodigo(int idUsuario, String codigo) {
        byte[] firma = hmac(claveCodigo, (idUsuario + ":" + codigo).getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(firma);
    }

    /** Comparacion en tiempo constante. */
    public static boolean iguales(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    /** Emite la prueba firmada que identifica al desafio {@code idToken} hasta {@code expira}. */
    public String emitirPrueba(long idToken, Instant expira) {
        byte[] nonce = new byte[16];
        azar.nextBytes(nonce);
        String payload = "v1." + idToken + "." + expira.getEpochSecond() + "." + B64.encodeToString(nonce);
        String cuerpo = B64.encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String firma = B64.encodeToString(hmac(clavePrueba, cuerpo.getBytes(StandardCharsets.UTF_8)));
        return cuerpo + "." + firma;
    }

    /** Devuelve el id del desafio si la prueba es autentica y no ha vencido; vacio en cualquier otro caso. */
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
        } catch (IllegalArgumentException e) { // base64 o numero invalido
            return OptionalLong.empty();
        }
    }

    /** SHA-256 en hexadecimal; se usa para no guardar correos ni IPs en claro en los limitadores. */
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
