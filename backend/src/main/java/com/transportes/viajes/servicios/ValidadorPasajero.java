package com.transportes.viajes.servicios;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import com.transportes.viajes.dto.PasajeroAsientoRequest;

/**
 * Reglas de validación de los datos de un pasajero. Clase pura (sin Spring, sin BD).
 * El frontend (src/utilidades/validarPasajero.js) replica estas reglas con los MISMOS mensajes.
 * La edad de un menor NO se valida aquí: es solo un aviso informativo del frontend.
 */
public final class ValidadorPasajero {

    public static final String CAMPO_TIPO_DOCUMENTO = "tipoDocumento";
    public static final String CAMPO_NUMERO_DOCUMENTO = "numeroDocumento";
    public static final String CAMPO_NOMBRES = "nombres";
    public static final String CAMPO_APELLIDOS = "apellidos";
    public static final String CAMPO_FECHA_NACIMIENTO = "fechaNacimiento";
    public static final String CAMPO_NRO_TELEFONO = "nroTelefono";

    public static final int EDAD_MAXIMA_ANIOS = 120;
    public static final int LONGITUD_MAXIMA_NOMBRE = 100;
    /**
     * Un mismo DNI PUEDE repetirse en una compra (una persona que compra varios asientos, p. ej. para ella y un
     * acompañante, o dos asientos para sí misma), pero entonces debe ser la misma persona: mismos nombres y
     * apellidos. Así se evita que un DNI quede asociado a dos identidades distintas.
     */
    public static final String MENSAJE_DNI_DATOS_DISTINTOS =
            "Este DNI ya está en otro asiento de esta compra con nombres distintos.";

    private static final Pattern DNI = Pattern.compile("^\\d{8}$");
    private static final Pattern CELULAR = Pattern.compile("^9\\d{8}$");
    private static final Pattern NOMBRE = Pattern.compile("^\\p{L}[\\p{L}\\p{M} '’.-]*$");

    public record ErrorCampo(Integer idAsiento, String campo, String mensaje) {
    }

    private ValidadorPasajero() {
    }

    /** Recorta espacios y pone el tipo de documento en mayúsculas. Es idempotente. */
    public static PasajeroAsientoRequest normalizar(PasajeroAsientoRequest p) {
        return new PasajeroAsientoRequest(
                p.idAsiento(),
                recortar(p.tipoDocumento()) == null ? null : recortar(p.tipoDocumento()).toUpperCase(),
                recortar(p.numeroDocumento()),
                recortar(p.nombres()),
                recortar(p.apellidos()),
                p.fechaNacimiento(),
                recortar(p.nroTelefono()));
    }

    /** Valida un pasajero (reglas por campo). Lista vacía = válido. */
    public static List<ErrorCampo> validar(PasajeroAsientoRequest original, LocalDate hoy) {
        PasajeroAsientoRequest p = normalizar(original);
        List<ErrorCampo> errores = new ArrayList<>();
        Integer id = p.idAsiento();

        if (!"DNI".equals(p.tipoDocumento())) {
            errores.add(new ErrorCampo(id, CAMPO_TIPO_DOCUMENTO, "Solo se admite DNI por ahora."));
        }

        if (esVacio(p.numeroDocumento())) {
            errores.add(new ErrorCampo(id, CAMPO_NUMERO_DOCUMENTO, "Ingresa el DNI."));
        } else if (!DNI.matcher(p.numeroDocumento()).matches()) {
            errores.add(new ErrorCampo(id, CAMPO_NUMERO_DOCUMENTO, "El DNI debe tener 8 dígitos."));
        }

        validarNombre(errores, id, CAMPO_NOMBRES, p.nombres(), "Ingresa los nombres.", "Ingresa un nombre válido.");
        validarNombre(errores, id, CAMPO_APELLIDOS, p.apellidos(), "Ingresa los apellidos.", "Ingresa un apellido válido.");

        LocalDate nacimiento = p.fechaNacimiento();
        if (nacimiento == null) {
            errores.add(new ErrorCampo(id, CAMPO_FECHA_NACIMIENTO, "Selecciona la fecha de nacimiento."));
        } else if (nacimiento.isAfter(hoy) || nacimiento.isBefore(hoy.minusYears(EDAD_MAXIMA_ANIOS))) {
            errores.add(new ErrorCampo(id, CAMPO_FECHA_NACIMIENTO, "Ingresa una fecha de nacimiento válida."));
        }

        if (esVacio(p.nroTelefono())) {
            errores.add(new ErrorCampo(id, CAMPO_NRO_TELEFONO, "Ingresa el celular."));
        } else if (!CELULAR.matcher(p.nroTelefono()).matches()) {
            errores.add(new ErrorCampo(id, CAMPO_NRO_TELEFONO, "Ingresa un celular válido (9 dígitos)."));
        }
        return errores;
    }

    /**
     * Valida cada pasajero y la coherencia de los DNI repetidos de la compra. Repetir un DNI es válido (varios
     * asientos de la misma persona); solo se rechaza si el 2.º o siguientes traen nombres/apellidos distintos a los
     * del primer asiento con ese DNI (el error va a ese asiento).
     */
    public static List<ErrorCampo> validarLote(List<PasajeroAsientoRequest> lista, LocalDate hoy) {
        List<ErrorCampo> errores = new ArrayList<>();
        Map<String, String> identidadPorDocumento = new HashMap<>();
        for (PasajeroAsientoRequest original : lista) {
            List<ErrorCampo> propios = validar(original, hoy);
            errores.addAll(propios);

            PasajeroAsientoRequest p = normalizar(original);
            boolean dniYaConError = propios.stream().anyMatch(e -> CAMPO_NUMERO_DOCUMENTO.equals(e.campo()));
            if (dniYaConError) continue;
            String identidad = claveIdentidad(p.nombres(), p.apellidos());
            String previa = identidadPorDocumento.putIfAbsent(p.tipoDocumento() + ":" + p.numeroDocumento(), identidad);
            if (previa != null && !previa.equals(identidad)) {
                errores.add(new ErrorCampo(p.idAsiento(), CAMPO_NUMERO_DOCUMENTO, MENSAJE_DNI_DATOS_DISTINTOS));
            }
        }
        return errores;
    }

    /** Nombres + apellidos sin diferencias de mayúsculas ni de espacios, para comparar identidades. */
    static String claveIdentidad(String nombres, String apellidos) {
        return normalizarParte(nombres) + "|" + normalizarParte(apellidos);
    }

    private static String normalizarParte(String texto) {
        return texto == null ? "" : texto.trim().replaceAll("\\s+", " ").toLowerCase(java.util.Locale.ROOT);
    }

    private static void validarNombre(List<ErrorCampo> errores, Integer id, String campo, String valor,
                                      String msgObligatorio, String msgInvalido) {
        if (esVacio(valor)) {
            errores.add(new ErrorCampo(id, campo, msgObligatorio));
        } else if (valor.length() > LONGITUD_MAXIMA_NOMBRE) {
            errores.add(new ErrorCampo(id, campo, "Máximo 100 caracteres."));
        } else if (valor.length() < 2 || !NOMBRE.matcher(valor).matches()) {
            errores.add(new ErrorCampo(id, campo, msgInvalido));
        }
    }

    private static String recortar(String s) {
        return s == null ? null : s.trim();
    }

    private static boolean esVacio(String s) {
        return s == null || s.isEmpty();
    }
}