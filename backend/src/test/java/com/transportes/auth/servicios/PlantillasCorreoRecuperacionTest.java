package com.transportes.auth.servicios;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PlantillasCorreoRecuperacionTest {

    @Test void elCorreoDeCodigoIncluyeLoPedido() {
        String html = PlantillasCorreoRecuperacion.htmlCodigo("Ana", "048213", 10);
        String texto = PlantillasCorreoRecuperacion.textoCodigo("Ana", "048213", 10);
        assertEquals("Código de recuperación de contraseña - RutaLibre", PlantillasCorreoRecuperacion.ASUNTO_CODIGO);
        for (String contenido : new String[]{html, texto}) {
            assertTrue(contenido.contains("Ana"));
            assertTrue(contenido.contains("048213"));
            assertTrue(contenido.contains("10 minutos"));
            assertTrue(contenido.contains("No compartas este código"));
            assertTrue(contenido.contains("ignora este mensaje"));
        }
    }

    @Test void elNombreSeEscapaEnHtmlParaEvitarInyeccion() {
        String html = PlantillasCorreoRecuperacion.htmlCodigo("<script>alert(1)</script>", "123456", 10);
        assertFalse(html.contains("<script>"));
        assertTrue(html.contains("&lt;script&gt;"));
    }

    @Test void sinNombreOConApellidoPlaceholderSaludaDeFormaNeutra() {
        assertTrue(PlantillasCorreoRecuperacion.textoCodigo(null, "123456", 10).startsWith("Hola,\n"));
        assertTrue(PlantillasCorreoRecuperacion.textoCodigo("-", "123456", 10).startsWith("Hola,\n"));
    }

    @Test void elAvisoDeCuentaGoogleNoLlevaCodigo() {
        String html = PlantillasCorreoRecuperacion.htmlCuentaGoogle("Ana");
        String texto = PlantillasCorreoRecuperacion.textoCuentaGoogle("Ana");
        assertFalse(texto.matches("(?s).*\\b\\d{6}\\b.*"));
        assertTrue(html.contains("Continuar con Google"));
        assertTrue(texto.contains("Continuar con Google"));
    }
}
