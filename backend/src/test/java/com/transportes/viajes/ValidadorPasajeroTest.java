package com.transportes.viajes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.transportes.viajes.dto.PasajeroAsientoRequest;
import com.transportes.viajes.servicios.ValidadorPasajero;
import com.transportes.viajes.servicios.ValidadorPasajero.ErrorCampo;

/** Compra de varios asientos por una misma persona: el DNI puede repetirse si es la misma identidad. */
class ValidadorPasajeroTest {

    private static final LocalDate HOY = LocalDate.of(2026, 10, 12);

    private static PasajeroAsientoRequest pasajero(int asiento, String dni, String nombres, String apellidos) {
        return new PasajeroAsientoRequest(asiento, "DNI", dni, nombres, apellidos, LocalDate.of(1990, 5, 20), "912345678");
    }

    @Test
    void unSoloPasajeroEsValido() {
        assertTrue(ValidadorPasajero.validarLote(List.of(pasajero(1, "12345678", "Juan", "Pérez Soto")), HOY).isEmpty());
    }

    @Test
    void mismaPersonaEnDosAsientosEsValida() {
        var lote = List.of(pasajero(10, "12345678", "Juan", "Pérez Soto"), pasajero(11, "12345678", "Juan", "Pérez Soto"));
        assertTrue(ValidadorPasajero.validarLote(lote, HOY).isEmpty());
    }

    @Test
    void mismaPersonaEnSeisAsientosEsValida() {
        var lote = new java.util.ArrayList<PasajeroAsientoRequest>();
        for (int i = 1; i <= 6; i++) lote.add(pasajero(i, "12345678", "Juan", "Pérez Soto"));
        assertTrue(ValidadorPasajero.validarLote(lote, HOY).isEmpty());
    }

    @Test
    void mayusculasYEspaciosNoCambianLaIdentidad() {
        var lote = List.of(pasajero(1, "12345678", "Juan", "Pérez Soto"), pasajero(2, "12345678", "  JUAN ", "pérez   soto"));
        assertTrue(ValidadorPasajero.validarLote(lote, HOY).isEmpty());
    }

    @Test
    void conAcompananteConOtroDniEsValido() {
        var lote = List.of(pasajero(1, "12345678", "Juan", "Pérez Soto"), pasajero(2, "87654321", "Ana", "Ruiz Vega"));
        assertTrue(ValidadorPasajero.validarLote(lote, HOY).isEmpty());
    }

    @Test
    void mismoDniConNombresDistintosSeRechazaEnElSegundoAsiento() {
        var lote = List.of(pasajero(1, "22222222", "Ana", "Uno"), pasajero(2, "22222222", "Beto", "Dos"));
        List<ErrorCampo> errores = ValidadorPasajero.validarLote(lote, HOY);
        assertEquals(1, errores.size());
        assertEquals(Integer.valueOf(2), errores.get(0).idAsiento());
        assertEquals(ValidadorPasajero.CAMPO_NUMERO_DOCUMENTO, errores.get(0).campo());
        assertEquals(ValidadorPasajero.MENSAJE_DNI_DATOS_DISTINTOS, errores.get(0).mensaje());
    }

    @Test
    void datosInvalidosSiguenSiendoErrorYNoGeneranErrorDeRepeticion() {
        var lote = List.of(pasajero(1, "123", "Juan", "Pérez"), pasajero(2, "123", "Otro", "Distinto"));
        List<ErrorCampo> errores = ValidadorPasajero.validarLote(lote, HOY);
        assertEquals(2, errores.size()); // "El DNI debe tener 8 dígitos." en cada asiento
        assertTrue(errores.stream().noneMatch(e -> ValidadorPasajero.MENSAJE_DNI_DATOS_DISTINTOS.equals(e.mensaje())));
    }
}
