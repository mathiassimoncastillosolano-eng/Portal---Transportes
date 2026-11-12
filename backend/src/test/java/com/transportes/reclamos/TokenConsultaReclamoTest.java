package com.transportes.reclamos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.transportes.reclamos.servicios.TokenConsultaReclamo;

class TokenConsultaReclamoTest {

    private static final String SECRETO = "secreto-de-pruebas-de-reclamos-solo-local-0123456789";

    @Test
    void elTokenEsEstableYSoloValeParaSuCodigo() {
        TokenConsultaReclamo tokens = new TokenConsultaReclamo(SECRETO);
        String token = tokens.generar("RL-2026-000001");
        assertEquals(token, tokens.generar("RL-2026-000001"));
        assertTrue(tokens.esValido("RL-2026-000001", token));
        assertFalse(tokens.esValido("RL-2026-000002", token));
        assertFalse(tokens.esValido("RL-2026-000001", null));
        assertFalse(tokens.esValido("RL-2026-000001", ""));
        assertFalse(tokens.esValido("RL-2026-000001", token + "x"));
    }

    @Test
    void secretosDistintosGenerabTokensDistintos() {
        String otro = "otro-secreto-de-pruebas-distinto-0123456789-abcdef";
        assertNotEquals(new TokenConsultaReclamo(SECRETO).generar("RL-2026-000001"),
                new TokenConsultaReclamo(otro).generar("RL-2026-000001"));
    }

    @Test
    void exigeUnSecretoLargo() {
        assertThrows(IllegalStateException.class, () -> new TokenConsultaReclamo("corto"));
        assertThrows(IllegalStateException.class, () -> new TokenConsultaReclamo(null));
    }
}
