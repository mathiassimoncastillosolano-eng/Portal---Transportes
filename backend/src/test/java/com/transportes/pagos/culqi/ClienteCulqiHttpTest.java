package com.transportes.pagos.culqi;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class ClienteCulqiHttpTest {

    final ObjectMapper json = JsonMapper.builder().build();
    final ClienteCulqiHttp cliente = new ClienteCulqiHttp("sk_test_abc", "https://api.culqi.com/v2", 5, json);

    SolicitudCargo solicitud(Autenticacion3ds a) {
        return new SolicitudCargo("RL-1234", new BigDecimal("100.50"), "PEN", "RutaLibre - pasajes de bus",
                "cliente@example.com", "tkn_test_abc12345", "Ana", "Pérez", "987654321", a);
    }

    @Test
    void elCuerpoDelCargoUsaCentimosYLlevaLaReferencia() {
        JsonNode c = cliente.construirCuerpoCargo(solicitud(null));
        assertEquals(10050, c.get("amount").asLong());
        assertEquals("PEN", c.get("currency_code").asText());
        assertEquals("tkn_test_abc12345", c.get("source_id").asText());
        assertEquals("RL-1234", c.get("metadata").get("referencia").asText());
        assertEquals("cliente@example.com", c.get("email").asText());
        assertTrue(c.get("capture").asBoolean());
        assertEquals("Ana", c.get("antifraud_details").get("first_name").asText());
        assertEquals("987654321", c.get("antifraud_details").get("phone_number").asText());
        assertFalse(c.has("authentication_3DS"));
    }

    @Test
    void conAutenticacion3dsSeAdjuntanLosParametros() {
        JsonNode c = cliente.construirCuerpoCargo(solicitud(new Autenticacion3ds("05", "x", "c", "2.2.0", "d")));
        assertEquals("05", c.get("authentication_3DS").get("eci").asText());
        assertEquals("2.2.0", c.get("authentication_3DS").get("protocolVersion").asText());
        assertEquals("d", c.get("authentication_3DS").get("directoryServerTransactionId").asText());
    }

    @Test
    void laDescripcionSeAcortaA80Caracteres() {
        SolicitudCargo s = new SolicitudCargo("RL-1", new BigDecimal("10.00"), "PEN", "x".repeat(200), "a@b.co",
                "tkn_test_abc12345", null, null, null, null);
        assertEquals(80, cliente.construirCuerpoCargo(s).get("description").asText().length());
    }

    @Test
    void importesInvalidosOSinTokenNoSeEnvian() {
        SolicitudCargo sinToken = new SolicitudCargo("RL-1", new BigDecimal("10.00"), "PEN", "d", "a@b.co", " ",
                null, null, null, null);
        assertThrows(ErrorCulqiException.class, () -> cliente.construirCuerpoCargo(sinToken));
        SolicitudCargo sinImporte = new SolicitudCargo("RL-1", BigDecimal.ZERO, "PEN", "d", "a@b.co",
                "tkn_test_abc12345", null, null, null, null);
        assertThrows(ErrorCulqiException.class, () -> cliente.construirCuerpoCargo(sinImporte));
    }

    @Test
    void cargoExitosoSeConvierteASoles() {
        String cuerpo = "{\"object\":\"charge\",\"id\":\"chr_test_1\",\"amount\":10050,\"amount_refunded\":0,"
                + "\"currency_code\":\"PEN\",\"capture\":true,\"metadata\":{\"referencia\":\"RL-1\"},"
                + "\"outcome\":{\"type\":\"venta_exitosa\",\"code\":\"AUT0000\"}}";
        CargoCulqi c = cliente.convertir(cliente.interpretar("POST", "/charges", 201, cuerpo));
        assertEquals("chr_test_1", c.id());
        assertEquals(0, new BigDecimal("100.50").compareTo(c.monto()));
        assertEquals("RL-1", c.referenciaExterna());
        assertTrue(c.aprobada());
        assertFalse(c.rechazada());
        assertFalse(c.reembolsadaTotalmente());
    }

    @Test
    void cargoSinCapturaNoSeConsideraAprobado() {
        String cuerpo = "{\"id\":\"chr_test_1\",\"amount\":1000,\"capture\":false,"
                + "\"outcome\":{\"type\":\"venta_exitosa\",\"code\":\"AUT0000\"}}";
        assertFalse(cliente.convertir(cliente.interpretar("GET", "/charges/x", 200, cuerpo)).aprobada());
    }

    @Test
    void cargoReembolsadoTotalmenteSeDetecta() {
        String cuerpo = "{\"id\":\"chr_test_1\",\"amount\":1000,\"amount_refunded\":1000,\"capture\":true,"
                + "\"outcome\":{\"type\":\"venta_exitosa\"}}";
        assertTrue(cliente.convertir(cliente.interpretar("GET", "/charges/x", 200, cuerpo)).reembolsadaTotalmente());
    }

    @Test
    void cargoRechazadoNoEsAprobado() {
        String cuerpo = "{\"id\":\"chr_test_1\",\"amount\":1000,\"capture\":true,\"outcome\":{\"type\":\"rechazada\"}}";
        CargoCulqi c = cliente.convertir(cliente.interpretar("GET", "/charges/x", 200, cuerpo));
        assertFalse(c.aprobada());
        assertTrue(c.rechazada());
    }

    @Test
    void errorDeTarjetaSeMapeaAPagoRechazadoConElCodigoDeDeclinacion() {
        String cuerpo = "{\"object\":\"error\",\"type\":\"card_error\",\"charge_id\":\"chr_test_9\","
                + "\"code\":\"card_declined\",\"decline_code\":\"insufficient_funds\","
                + "\"merchant_message\":\"fondos\",\"user_message\":\"Sin fondos\"}";
        ErrorCulqiException e = assertThrows(ErrorCulqiException.class,
                () -> cliente.interpretar("POST", "/charges", 402, cuerpo));
        assertEquals(ErrorCulqiException.Tipo.PAGO_RECHAZADO, e.getTipo());
        assertEquals("insufficient_funds", e.getCodigo());
        assertEquals("chr_test_9", e.getIdCargo());
        assertEquals("Sin fondos", e.getMensajeUsuario());
        assertFalse(e.esReintentable());
    }

    @Test
    void erroresDeParametroSonSolicitudInvalidaYLosDeServidorSonDesconocidos() {
        ErrorCulqiException invalido = assertThrows(ErrorCulqiException.class, () -> cliente.interpretar("POST",
                "/charges", 400, "{\"object\":\"error\",\"type\":\"parameter_error\",\"code\":\"invalid_token\"}"));
        assertEquals(ErrorCulqiException.Tipo.SOLICITUD_INVALIDA, invalido.getTipo());
        assertFalse(invalido.esReintentable());

        ErrorCulqiException auth = assertThrows(ErrorCulqiException.class,
                () -> cliente.interpretar("POST", "/charges", 401, "{\"type\":\"authentication_error\"}"));
        assertTrue(auth.esReintentable());

        for (int estado : new int[] { 429, 500, 503 }) {
            ErrorCulqiException e = assertThrows(ErrorCulqiException.class,
                    () -> cliente.interpretar("POST", "/charges", estado, "{}"));
            assertEquals(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO, e.getTipo());
        }
        assertEquals(ErrorCulqiException.Tipo.NO_ENCONTRADO,
                assertThrows(ErrorCulqiException.class, () -> cliente.interpretar("GET", "/charges/x", 404, "{}"))
                        .getTipo());
    }

    @Test
    void sinLlaveSecretaNoSeLlamaALaApi() {
        ClienteCulqiHttp sin = new ClienteCulqiHttp("", "https://api.culqi.com/v2", 5, json);
        assertFalse(sin.configurado());
        ErrorCulqiException e = assertThrows(ErrorCulqiException.class, () -> sin.consultarCargo("chr_test_1"));
        assertEquals(ErrorCulqiException.Tipo.NO_CONFIGURADO, e.getTipo());
    }

    @Test
    void conversionesDeMonto() {
        assertEquals(0, new BigDecimal("12.34").compareTo(ClienteCulqiHttp.aSoles("1234")));
        assertNull(ClienteCulqiHttp.aSoles(null));
        assertEquals(1234L, ClienteCulqiHttp.enCentimos(new BigDecimal("12.34")));
    }
}
