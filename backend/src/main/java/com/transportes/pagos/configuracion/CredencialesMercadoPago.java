package com.transportes.pagos.configuracion;

import java.util.EnumMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.pagos.entidades.EntornoPago;

/**
 * Credenciales de Mercado Pago separadas por entorno. Es el ÚNICO lugar que lee los secretos de las variables de
 * entorno; el resto del código pide las credenciales por {@link EntornoPago}.
 *
 * <p>Cada entorno tiene tres valores:
 * <ul>
 *   <li><b>Access Token</b> (privado): autentica las llamadas del backend a la API. Nunca sale del servidor.</li>
 *   <li><b>Public Key</b> (pública por diseño): la usa MercadoPago.js en el navegador para generar tokens de un
 *       solo uso. El backend se la entrega al frontend; no hace falta una variable VITE_* por entorno.</li>
 *   <li><b>Clave secreta de Webhooks</b> (privada): valida la firma {@code x-signature} de las notificaciones.</li>
 * </ul>
 *
 * <p>Tanto las credenciales de prueba como las productivas empiezan por {@code APP_USR-}: el prefijo NO sirve para
 * distinguirlas. Por eso el entorno se registra en cada operación y no se deduce del token.</p>
 *
 * <p>Protección contra un error de configuración muy peligroso: si el Access Token (o la Public Key) de
 * Producción es idéntico al de Sandbox, Producción se considera NO configurado. Así nunca se registraría como
 * "real" una operación procesada con credenciales de prueba.</p>
 */
@Component
public class CredencialesMercadoPago {

    private static final Logger log = LoggerFactory.getLogger(CredencialesMercadoPago.class);

    /** Credenciales de un entorno. {@code toString} no revela ningún secreto. */
    public record Par(String accessToken, String publicKey, String webhookSecret) {

        public boolean tieneAccessToken() {
            return !accessToken.isEmpty();
        }

        public boolean tienePublicKey() {
            return !publicKey.isEmpty();
        }

        public boolean tieneWebhookSecret() {
            return !webhookSecret.isEmpty();
        }

        @Override
        public String toString() {
            return "Par[accessToken=" + (tieneAccessToken() ? "***" : "(vacío)")
                    + ", publicKey=" + (tienePublicKey() ? "***" : "(vacía)")
                    + ", webhookSecret=" + (tieneWebhookSecret() ? "***" : "(vacío)") + "]";
        }
    }

    private static final Par VACIO = new Par("", "", "");

    private final Map<EntornoPago, Par> porEntorno = new EnumMap<>(EntornoPago.class);

    public CredencialesMercadoPago(
            @Value("${mercadopago.sandbox.access-token:}") String sandboxAccessToken,
            @Value("${mercadopago.sandbox.public-key:}") String sandboxPublicKey,
            @Value("${mercadopago.sandbox.webhook-secret:}") String sandboxWebhookSecret,
            @Value("${mercadopago.production.access-token:}") String productionAccessToken,
            @Value("${mercadopago.production.public-key:}") String productionPublicKey,
            @Value("${mercadopago.production.webhook-secret:}") String productionWebhookSecret) {
        Par sandbox = new Par(limpio(sandboxAccessToken), limpio(sandboxPublicKey), limpio(sandboxWebhookSecret));
        Par produccion = new Par(limpio(productionAccessToken), limpio(productionPublicKey),
                limpio(productionWebhookSecret));

        if (produccion.tieneAccessToken() && produccion.accessToken().equals(sandbox.accessToken())) {
            log.error("MERCADOPAGO_PRODUCTION_ACCESS_TOKEN es igual al de Sandbox: Producción queda DESHABILITADA "
                    + "hasta que se configuren las credenciales productivas reales");
            produccion = VACIO;
        } else if (produccion.tienePublicKey() && produccion.publicKey().equals(sandbox.publicKey())) {
            log.error("MERCADOPAGO_PRODUCTION_PUBLIC_KEY es igual a la de Sandbox: Producción queda DESHABILITADA");
            produccion = VACIO;
        }
        porEntorno.put(EntornoPago.SANDBOX, sandbox);
        porEntorno.put(EntornoPago.PRODUCTION, produccion);
    }

    public Par de(EntornoPago entorno) {
        return porEntorno.get(entorno);
    }

    /**
     * ¿Se puede cobrar en este entorno? Sandbox solo necesita el Access Token (la Public Key de prueba puede seguir
     * llegando por VITE_MERCADOPAGO_PUBLIC_KEY, como antes). Producción exige Access Token y Public Key: no hay
     * respaldo para la clave pública productiva.
     */
    public boolean disponible(EntornoPago entorno) {
        Par par = de(entorno);
        if (entorno == EntornoPago.PRODUCTION) {
            return par.tieneAccessToken() && par.tienePublicKey();
        }
        return par.tieneAccessToken();
    }

    private static String limpio(String valor) {
        return valor == null ? "" : valor.strip();
    }
}
