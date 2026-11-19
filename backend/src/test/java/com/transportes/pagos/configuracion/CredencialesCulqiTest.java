package com.transportes.pagos.configuracion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.transportes.pagos.entidades.EntornoPago;

class CredencialesCulqiTest {

    @Test
    void llavesDePruebaSeInterpretanComoSandbox() {
        CredencialesCulqi c = new CredencialesCulqi("pk_test_abc123", "sk_test_def456");
        assertTrue(c.disponible());
        assertEquals(EntornoPago.SANDBOX, c.entorno());
    }

    @Test
    void llavesLiveSeInterpretanComoProduccion() {
        CredencialesCulqi c = new CredencialesCulqi("pk_live_abc123", "sk_live_def456");
        assertTrue(c.disponible());
        assertEquals(EntornoPago.PRODUCTION, c.entorno());
    }

    @Test
    void llavesDeEntornosDistintosDeshabilitanLosPagos() {
        assertFalse(new CredencialesCulqi("pk_test_abc123", "sk_live_def456").disponible());
    }

    @Test
    void llavesVaciasOConFormatoInvalidoDeshabilitanLosPagos() {
        assertFalse(new CredencialesCulqi("", "").disponible());
        assertFalse(new CredencialesCulqi("APP_USR-123", "sk_test_def456").disponible());
        assertFalse(new CredencialesCulqi("sk_test_def456", "pk_test_abc123").disponible());
    }

    @Test
    void toStringNoExponeLasLlaves() {
        String texto = new CredencialesCulqi("pk_test_abc123", "sk_test_secretoXYZ").toString();
        assertFalse(texto.contains("secretoXYZ"));
        assertFalse(texto.contains("abc123"));
    }
}
