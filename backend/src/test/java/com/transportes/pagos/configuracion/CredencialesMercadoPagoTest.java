package com.transportes.pagos.configuracion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.transportes.pagos.entidades.EntornoPago;

class CredencialesMercadoPagoTest {

    @Test
    void cadaEntornoUsaSusPropiasCredenciales() {
        CredencialesMercadoPago c = new CredencialesMercadoPago("tok-s", "pk-s", "ws-s", "tok-p", "pk-p", "ws-p");
        assertEquals("tok-s", c.de(EntornoPago.SANDBOX).accessToken());
        assertEquals("tok-p", c.de(EntornoPago.PRODUCTION).accessToken());
        assertEquals("pk-p", c.de(EntornoPago.PRODUCTION).publicKey());
        assertEquals("ws-s", c.de(EntornoPago.SANDBOX).webhookSecret());
        assertTrue(c.disponible(EntornoPago.SANDBOX));
        assertTrue(c.disponible(EntornoPago.PRODUCTION));
    }

    @Test
    void produccionSeDeshabilitaSiElTokenEsIgualAlDeSandbox() {
        CredencialesMercadoPago c = new CredencialesMercadoPago("mismo", "pk-s", "", "mismo", "pk-p", "");
        assertFalse(c.disponible(EntornoPago.PRODUCTION));
        assertTrue(c.disponible(EntornoPago.SANDBOX));
    }

    @Test
    void produccionSeDeshabilitaSiLaPublicKeyEsIgualALaDeSandbox() {
        CredencialesMercadoPago c = new CredencialesMercadoPago("a", "misma", "", "b", "misma", "");
        assertFalse(c.disponible(EntornoPago.PRODUCTION));
    }

    @Test
    void produccionExigeAccessTokenYPublicKey() {
        assertFalse(new CredencialesMercadoPago("a", "", "", "b", "", "").disponible(EntornoPago.PRODUCTION));
        assertFalse(new CredencialesMercadoPago("a", "", "", "", "pk", "").disponible(EntornoPago.PRODUCTION));
    }

    @Test
    void sandboxSoloNecesitaElAccessToken() {
        assertTrue(new CredencialesMercadoPago("a", "", "", "", "", "").disponible(EntornoPago.SANDBOX));
        assertFalse(new CredencialesMercadoPago("", "pk", "", "", "", "").disponible(EntornoPago.SANDBOX));
    }

    @Test
    void toStringNoRevelaSecretos() {
        String texto = new CredencialesMercadoPago("TOKEN-SECRETO", "PK-X", "WEBHOOK-SECRETO", "", "", "")
                .de(EntornoPago.SANDBOX).toString();
        assertFalse(texto.contains("TOKEN-SECRETO"));
        assertFalse(texto.contains("WEBHOOK-SECRETO"));
        assertFalse(texto.contains("PK-X"));
    }
}
