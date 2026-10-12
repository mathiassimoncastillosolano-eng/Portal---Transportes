package com.transportes.pagos.mercadopago;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Validación centralizada del documento del pagador antes de enviarlo a Mercado Pago.
 *
 * <p>Reglas (todas verificables en el catálogo {@code GET /v1/identification_types} de Perú, que el
 * propio Brick usa para el formulario): DNI = 8 dígitos; C.E = 8 a 12 dígitos; RUC = 11 a 12 caracteres
 * alfanuméricos; Otro = 5 a 20 dígitos.
 *
 * <p>Principios: nunca se inventan dígitos ni se rellena con ceros; nunca se cambia el tipo del usuario por
 * otro "parecido" (C.E→CE, CE→CI, X→Otro). El único cambio de tipo posible es un mapeo EXPLÍCITO
 * configurado por el operador ({@code mercadopago.identificacion.mapeo-tipos}), vacío por defecto.
 * Si el documento no puede enviarse con seguridad, se OMITE la identificación (no se rechaza la compra
 * por ello) y se informa el motivo, sin datos personales.
 */
public final class DocumentoPagador {

    public enum Motivo {
        ENVIADO,
        SIN_DATOS,
        TIPO_DESCONOCIDO,
        TIPO_NO_HABILITADO,
        NUMERO_INVALIDO
    }

    public record Resultado(Motivo motivo, String tipo, String numero) {
        public boolean enviar() {
            return motivo == Motivo.ENVIADO;
        }
    }

    /** Tipos del catálogo de Perú, tal como los devuelve /v1/identification_types. */
    public static final Set<String> TIPOS_CATALOGO = Set.of("DNI", "C.E", "RUC", "Otro");

    private DocumentoPagador() {
    }

    /**
     * @param tipo          tipo elegido por el usuario (id del catálogo, sensible a mayúsculas)
     * @param numero        número tal como lo ingresó
     * @param habilitados   tipos que el operador permite enviar a la API de Orders
     * @param mapeo         traducciones explícitas catálogo→Orders (puede estar vacío)
     */
    public static Resultado evaluar(String tipo, String numero, Set<String> habilitados, Map<String, String> mapeo) {
        String t = tipo == null ? "" : tipo.strip();
        String n = numero == null ? "" : numero.strip();
        if (t.isEmpty() || n.isEmpty()) {
            return new Resultado(Motivo.SIN_DATOS, null, null);
        }
        if (!TIPOS_CATALOGO.contains(t)) {
            return new Resultado(Motivo.TIPO_DESCONOCIDO, null, null);
        }
        if (!numeroValido(t, n)) {
            return new Resultado(Motivo.NUMERO_INVALIDO, null, null);
        }
        if (habilitados == null || !habilitados.contains(t)) {
            return new Resultado(Motivo.TIPO_NO_HABILITADO, null, null);
        }
        String enviado = mapeo != null && mapeo.containsKey(t) ? mapeo.get(t) : t;
        return new Resultado(Motivo.ENVIADO, enviado, n);
    }

    public static boolean numeroValido(String tipo, String n) {
        return switch (tipo) {
            case "DNI" -> n.matches("\\d{8}");
            case "C.E" -> n.matches("\\d{8,12}");
            case "RUC" -> n.matches("[A-Za-z0-9]{11,12}");
            case "Otro" -> n.matches("\\d{5,20}");
            default -> false;
        };
    }

    /** Convierte "C.E=CE,Otro=XX" en un mapa. Entradas mal formadas se ignoran. */
    public static Map<String, String> analizarMapeo(String texto) {
        if (texto == null || texto.isBlank()) {
            return Map.of();
        }
        java.util.HashMap<String, String> m = new java.util.HashMap<>();
        for (String par : texto.split(",")) {
            int i = par.indexOf('=');
            if (i > 0 && i < par.length() - 1) {
                m.put(par.substring(0, i).strip(), par.substring(i + 1).strip());
            }
        }
        return Map.copyOf(m);
    }

    public static Set<String> analizarTipos(String texto) {
        if (texto == null || texto.isBlank()) {
            return Set.of();
        }
        java.util.HashSet<String> s = new java.util.HashSet<>();
        for (String t : texto.split(",")) {
            if (!t.isBlank()) {
                s.add(t.strip());
            }
        }
        return Set.copyOf(s);
    }

    /** Solo para el log: el motivo sin datos personales. */
    public static Optional<String> descripcion(Resultado r) {
        return switch (r.motivo()) {
            case ENVIADO -> Optional.empty();
            case SIN_DATOS -> Optional.of("no se recibió documento");
            case TIPO_DESCONOCIDO -> Optional.of("tipo fuera del catálogo de Perú");
            case TIPO_NO_HABILITADO -> Optional.of("tipo no habilitado para Orders (MERCADOPAGO_IDENTIFICACION_TIPOS)");
            case NUMERO_INVALIDO -> Optional.of("longitud/formato del número no coincide con el catálogo");
        };
    }
}
