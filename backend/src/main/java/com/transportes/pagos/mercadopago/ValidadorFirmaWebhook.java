package com.transportes.pagos.mercadopago;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Verifica la cabecera {@code x-signature} de las notificaciones Webhook de Mercado Pago.
 *
 * <p>Replica el algoritmo de {@code com.mercadopago.webhook.WebhookSignatureValidator} del SDK oficial de Java:
 * manifiesto {@code id:<data.id>;request-id:<x-request-id>;ts:<ts>;} (se omite cada par si su valor falta),
 * HMAC-SHA256 con la clave secreta de la aplicación, salida hexadecimal en minúsculas y comparación en tiempo
 * constante. La documentación anterior de Webhooks pedía usar {@code data.id} en minúsculas si es alfanumérico;
 * por compatibilidad también se acepta esa variante (ambas exigen conocer la clave secreta).</p>
 */
@Component
public class ValidadorFirmaWebhook {

    private final String secreto;
    private final Duration tolerancia;

    public ValidadorFirmaWebhook(@Value("${mercadopago.webhook-secret:}") String secreto,
                                 @Value("${mercadopago.webhook-tolerancia-segundos:0}") long toleranciaSegundos) {
        this.secreto = secreto == null ? "" : secreto.strip();
        this.tolerancia = toleranciaSegundos > 0 ? Duration.ofSeconds(toleranciaSegundos) : null;
    }

    public boolean configurado() {
        return !secreto.isEmpty();
    }

    /** @return true solo si la firma es auténtica (y, si se configuró, reciente). */
    public boolean esValida(String xSignature, String xRequestId, String dataId) {
        return esValida(xSignature, xRequestId, dataId, Instant.now());
    }

    boolean esValida(String xSignature, String xRequestId, String dataId, Instant ahora) {
        if (!configurado()) {
            return false;
        }
        String firma = normalizar(xSignature);
        if (firma == null) {
            return false;
        }
        String ts = null;
        String v1 = null;
        for (String parte : firma.split(",")) {
            int igual = parte.indexOf('=');
            if (igual <= 0 || igual == parte.length() - 1) {
                continue;
            }
            String clave = parte.substring(0, igual).trim().toLowerCase(Locale.ROOT);
            String valor = parte.substring(igual + 1).trim();
            if ("ts".equals(clave)) {
                ts = valor;
            } else if ("v1".equals(clave)) {
                v1 = valor;
            }
        }
        if (ts == null || v1 == null || !ts.matches("\\d+")) {
            return false;
        }
        String requestId = normalizar(xRequestId);
        String id = normalizar(dataId);

        boolean valida = coincide(manifiesto(id, requestId, ts), v1)
                || (id != null && !id.equals(id.toLowerCase(Locale.ROOT))
                        && coincide(manifiesto(id.toLowerCase(Locale.ROOT), requestId, ts), v1));
        if (!valida) {
            return false;
        }
        if (tolerancia != null) {
            long tsMs = Long.parseLong(ts) * 1000L;
            return Math.abs(ahora.toEpochMilli() - tsMs) <= tolerancia.toMillis();
        }
        return true;
    }

    static String manifiesto(String dataId, String requestId, String ts) {
        StringBuilder sb = new StringBuilder();
        if (dataId != null) {
            sb.append("id:").append(dataId).append(';');
        }
        if (requestId != null) {
            sb.append("request-id:").append(requestId).append(';');
        }
        sb.append("ts:").append(ts).append(';');
        return sb.toString();
    }

    /** Firma un manifiesto (útil para pruebas y para el botón "Simular" del panel). */
    public String firmar(String manifiesto) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifiesto.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 no disponible", e);
        }
    }

    private boolean coincide(String manifiesto, String recibido) {
        byte[] calculado = firmar(manifiesto).getBytes(StandardCharsets.UTF_8);
        byte[] esperado = recibido.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(calculado, esperado);
    }

    private static String normalizar(String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.trim();
        return recortado.isEmpty() ? null : recortado;
    }
}
