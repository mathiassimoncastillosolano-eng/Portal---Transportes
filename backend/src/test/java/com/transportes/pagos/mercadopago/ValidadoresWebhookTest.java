package com.transportes.pagos.mercadopago;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.transportes.pagos.configuracion.CredencialesMercadoPago;
import com.transportes.pagos.entidades.EntornoPago;

class ValidadoresWebhookTest {

    static final List<EntornoPago> AMBOS = List.of(EntornoPago.SANDBOX, EntornoPago.PRODUCTION);

    final ValidadoresWebhook validadores = new ValidadoresWebhook(
            new CredencialesMercadoPago("ts", "pks", "secreto-sandbox", "tp", "pkp", "secreto-produccion"), 0);

    String firma(EntornoPago entorno, String requestId, String dataId, String ts) {
        String manifiesto = ValidadorFirmaWebhook.manifiesto(dataId, requestId, ts);
        return "ts=" + ts + ",v1=" + validadores.de(entorno).firmar(manifiesto);
    }

    @Test
    void laFirmaSoloValidaParaElEntornoQueLaGenero() {
        String f = firma(EntornoPago.SANDBOX, "r1", "ORD1", "1704908010");
        assertEquals(List.of(EntornoPago.SANDBOX), validadores.entornosConFirmaValida(AMBOS, f, "r1", "ORD1"));
        assertTrue(validadores.entornosConFirmaValida(List.of(EntornoPago.PRODUCTION), f, "r1", "ORD1").isEmpty());
    }

    @Test
    void unaFirmaDeProduccionNoSirveEnLaUrlDeSandbox() {
        String f = firma(EntornoPago.PRODUCTION, "r1", "ORD1", "1704908010");
        assertTrue(validadores.entornosConFirmaValida(List.of(EntornoPago.SANDBOX), f, "r1", "ORD1").isEmpty());
        assertEquals(List.of(EntornoPago.PRODUCTION), validadores.entornosConFirmaValida(AMBOS, f, "r1", "ORD1"));
    }

    @Test
    void siCambiaElIdDeLaOrdenLaFirmaEsInvalida() {
        String f = firma(EntornoPago.SANDBOX, "r1", "ORD1", "1704908010");
        assertTrue(validadores.entornosConFirmaValida(AMBOS, f, "r1", "ORD-OTRA").isEmpty());
    }

    @Test
    void detectaSiHayAlgunSecretoConfigurado() {
        assertTrue(validadores.algunoConfigurado(AMBOS));
        ValidadoresWebhook ninguno = new ValidadoresWebhook(new CredencialesMercadoPago("a", "b", "", "c", "d", ""), 0);
        assertFalse(ninguno.algunoConfigurado(AMBOS));
    }

    @Test
    void elDiagnosticoNoRevelaLosSecretos() {
        String texto = validadores.diagnosticar(AMBOS, "ts=1,v1=00", "r1", "ORD1");
        assertFalse(texto.contains("secreto-sandbox"));
        assertFalse(texto.contains("secreto-produccion"));
    }
}
