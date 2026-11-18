package com.transportes.pagos.configuracion;

import java.util.EnumMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.pagos.entidades.EntornoPago;

/** Lee y guarda las credenciales de Mercado Pago de cada entorno. */
@Component
public class CredencialesMercadoPago {

    private static final Logger log = LoggerFactory.getLogger(CredencialesMercadoPago.class);

    /** Las tres credenciales de un entorno. Su toString no muestra los secretos. */
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

        /** Muestra *** en lugar de los secretos, para que sea seguro imprimirlo en el log. */
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

    /** Credenciales del entorno pedido. */
    public Par de(EntornoPago entorno) {
        return porEntorno.get(entorno);
    }

    /**
     * true si se puede cobrar en ese entorno. Sandbox solo necesita el Access Token; Producción necesita Access
     * Token y Public Key.
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
