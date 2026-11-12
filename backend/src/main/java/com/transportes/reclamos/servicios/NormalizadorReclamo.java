package com.transportes.reclamos.servicios;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import com.transportes.reclamos.dto.RegistrarReclamoRequest;

final class NormalizadorReclamo {

    private static final Pattern CONTROL = Pattern.compile("[\\p{Cntrl}&&[^\\n]]");
    private static final Pattern ESPACIOS = Pattern.compile("[ \\t]+");
    private static final Pattern SALTOS = Pattern.compile("\\n{3,}");
    private static final Pattern NOMBRE = Pattern.compile("^\\p{L}[\\p{L} .'’-]{2,199}$");
    private static final Pattern CORREO = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$");
    private static final Pattern TELEFONO = Pattern.compile("^\\+?[0-9][0-9 ()-]{5,18}[0-9]$");
    private static final Pattern DNI = Pattern.compile("^\\d{8}$");
    private static final Pattern CARNE = Pattern.compile("^[A-Z0-9]{9,12}$");
    private static final Pattern PASAPORTE = Pattern.compile("^[A-Z0-9]{6,12}$");

    private NormalizadorReclamo() {
    }

    static String linea(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = Normalizer.normalize(valor, Normalizer.Form.NFC);
        limpio = CONTROL.matcher(limpio.replace("\r\n", "\n").replace('\r', '\n')).replaceAll(" ");
        limpio = ESPACIOS.matcher(limpio.replace('\n', ' ')).replaceAll(" ").strip();
        return limpio.isEmpty() ? null : limpio;
    }

    static String texto(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = Normalizer.normalize(valor, Normalizer.Form.NFC).replace("\r\n", "\n").replace('\r', '\n');
        limpio = CONTROL.matcher(limpio).replaceAll("");
        limpio = SALTOS.matcher(limpio).replaceAll("\n\n").strip();
        return limpio.isEmpty() ? null : limpio;
    }

    static String documento(String valor) {
        String limpio = linea(valor);
        return limpio == null ? null : limpio.replace(" ", "").toUpperCase(Locale.ROOT);
    }

    static String correo(String valor) {
        String limpio = linea(valor);
        return limpio == null ? null : limpio.toLowerCase(Locale.ROOT);
    }

    static List<String> validar(RegistrarReclamoRequest r, String nombres, String tipoDoc, String numDoc,
            String correo, String telefono, String detalle, String pedido, LocalDate hoy) {
        List<String> errores = new ArrayList<>();
        if (nombres == null || !NOMBRE.matcher(nombres).matches()) {
            errores.add("Los nombres solo pueden contener letras, espacios, puntos, guiones y apóstrofes.");
        }
        boolean documentoValido = numDoc != null && switch (tipoDoc) {
            case "DNI" -> DNI.matcher(numDoc).matches();
            case "CE" -> CARNE.matcher(numDoc).matches();
            default -> PASAPORTE.matcher(numDoc).matches();
        };
        if (!documentoValido) {
            errores.add(switch (tipoDoc) {
                case "DNI" -> "El DNI debe tener 8 dígitos.";
                case "CE" -> "El carné de extranjería debe tener entre 9 y 12 caracteres alfanuméricos.";
                default -> "El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.";
            });
        }
        if (correo == null || !CORREO.matcher(correo).matches()) {
            errores.add("Ingresa un correo electrónico válido.");
        }
        if (telefono == null || !TELEFONO.matcher(telefono).matches()) {
            errores.add("Ingresa un teléfono válido.");
        }
        if (detalle == null || detalle.length() < 20) {
            errores.add("El detalle debe tener al menos 20 caracteres.");
        }
        if (pedido == null || pedido.length() < 10) {
            errores.add("El pedido debe tener al menos 10 caracteres.");
        }
        if (r.fechaIncidente() != null) {
            if (r.fechaIncidente().isAfter(hoy)) {
                errores.add("La fecha del incidente no puede ser futura.");
            } else if (r.fechaIncidente().isBefore(hoy.minusYears(5))) {
                errores.add("La fecha del incidente es demasiado antigua.");
            }
        }
        if (r.fechaServicio() != null
                && (r.fechaServicio().isBefore(hoy.minusYears(5)) || r.fechaServicio().isAfter(hoy.plusYears(1)))) {
            errores.add("La fecha del servicio no es válida.");
        }
        return errores;
    }
}
