package com.transportes.pagos.configuracion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.transportes.pagos.dto.ConfiguracionPagoResponse;
import com.transportes.pagos.entidades.EntornoPago;
import com.transportes.pagos.excepciones.PagoException;

class AutorizadorEntornoPagoTest {

    static final CredencialesMercadoPago AMBOS =
            new CredencialesMercadoPago("tok-s", "pk-s", "", "tok-p", "pk-p", "");
    static final CredencialesMercadoPago SIN_PRODUCCION =
            new CredencialesMercadoPago("tok-s", "pk-s", "", "", "", "");

    static AutorizadorEntornoPago con(String usuarios, CredencialesMercadoPago c) {
        return new AutorizadorEntornoPago(usuarios, c);
    }

    @Test
    void analizaLaListaIgnorandoValoresInvalidos() {
        assertEquals(Set.of(12, 15), AutorizadorEntornoPago.analizarUsuarios("12, 15,abc,,12,-3,0"));
        assertTrue(AutorizadorEntornoPago.analizarUsuarios(null).isEmpty());
        assertTrue(AutorizadorEntornoPago.analizarUsuarios("  ").isEmpty());
    }

    @Test
    void conListaVaciaNadieUsaSandbox() {
        AutorizadorEntornoPago a = con("", AMBOS);
        assertFalse(a.puedeUsarSandbox(1));
        assertFalse(a.puedeUsarSandbox(null));
    }

    @Test
    void sinSolicitudSeUsaProduccion() {
        assertEquals(EntornoPago.PRODUCTION, con("7", AMBOS).resolver(null, 7));
        assertEquals(EntornoPago.PRODUCTION, con("7", AMBOS).resolver("  ", 7));
    }

    @Test
    void usuarioAutorizadoPuedeElegirSandbox() {
        assertEquals(EntornoPago.SANDBOX, con("7", AMBOS).resolver("sandbox", 7));
    }

    @Test
    void usuarioNoAutorizadoRecibe403AunqueElNavegadorPidaSandbox() {
        PagoException e = assertThrows(PagoException.class, () -> con("7", AMBOS).resolver("SANDBOX", 8));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatus());
    }

    @Test
    void entornoInvalidoRecibe400() {
        PagoException e = assertThrows(PagoException.class, () -> con("7", AMBOS).resolver("STAGING", 7));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatus());
    }

    @Test
    void produccionSinCredencialesRecibe503YNoCaeEnSandbox() {
        PagoException e = assertThrows(PagoException.class, () -> con("7", SIN_PRODUCCION).resolver("PRODUCTION", 7));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.getStatus());
        assertThrows(PagoException.class, () -> con("7", SIN_PRODUCCION).resolver(null, 7));
    }

    @Test
    void laConfiguracionSoloOfreceSandboxALosAutorizados() {
        ConfiguracionPagoResponse normal = con("7", AMBOS).configuracionPara(8);
        assertEquals(1, normal.entornos().size());
        assertEquals("PRODUCTION", normal.entornos().get(0).codigo());
        assertEquals("PRODUCTION", normal.entornoPorDefecto());

        ConfiguracionPagoResponse autorizado = con("7", AMBOS).configuracionPara(7);
        assertEquals(2, autorizado.entornos().size());
        assertEquals("pk-s", autorizado.entornos().get(1).publicKey());
    }

    @Test
    void produccionNoConfiguradaSeInformaComoNoDisponibleSinClave() {
        var produccion = con("", SIN_PRODUCCION).configuracionPara(1).entornos().get(0);
        assertFalse(produccion.disponible());
        assertNull(produccion.publicKey());
    }
}
