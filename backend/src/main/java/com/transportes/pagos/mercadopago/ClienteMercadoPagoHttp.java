package com.transportes.pagos.mercadopago;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Hace las llamadas HTTP a la API de Mercado Pago. */
public class ClienteMercadoPagoHttp implements ClienteMercadoPago {

    private static final Logger log = LoggerFactory.getLogger(ClienteMercadoPagoHttp.class);
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final String accessToken;
    private final String urlBase;
    private final Duration timeout;
    private final ObjectMapper json;
    private final HttpClient http;

    /** Se crea uno por entorno (ver ClientesMercadoPago); no es un bean de Spring. */
    public ClienteMercadoPagoHttp(String accessToken, String urlBase, long timeoutSegundos, ObjectMapper json) {
        this.accessToken = accessToken == null ? "" : accessToken.strip();
        this.urlBase = urlBase.replaceAll("/+$", "");
        this.timeout = Duration.ofSeconds(timeoutSegundos);
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    }

    /** true si hay Access Token para este entorno. */
    @Override
    public boolean configurado() {
        return !accessToken.isEmpty();
    }

    /** Crea el pago en Mercado Pago. */
    @Override
    public OrdenMercadoPago crearOrden(SolicitudOrden s, String claveIdempotencia) {
        try {
            return leerOrden(enviar("POST", "/v1/orders", construirCuerpoOrden(s, true).toString(), claveIdempotencia,
                    s.deviceId()));
        } catch (ErrorMercadoPagoException e) {
            boolean formatoRechazado = e.getTipo() == ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA
                    && (e.getEstadoHttp() == 400 || e.getEstadoHttp() == 422);
            if (!formatoRechazado || !s.tieneDatosAdicionales()) {
                throw e;
            }
            log.warn("Mercado Pago rechazó la solicitud con datos adicionales del pagador (HTTP {}, código {}, detalle {}); "
                    + "se reintenta con el cuerpo mínimo", e.getEstadoHttp(), e.getCodigo(), e.getDetalle());
            return leerOrden(enviar("POST", "/v1/orders", construirCuerpoOrden(s, false).toString(),
                    claveIdempotencia + "-min", s.deviceId()));
        }
    }

    /** Consulta el estado de un pago. */
    @Override
    public OrdenMercadoPago consultarOrden(String idOrden) {
        return leerOrden(enviar("GET", "/v1/orders/" + codificar(idOrden), null, null));
    }

    /** Busca una order por nuestra referencia (cuando nunca supimos su id). */
    @Override
    public Optional<OrdenMercadoPago> buscarPorReferencia(String referencia, OffsetDateTime desde,
            OffsetDateTime hasta) {
        String consulta = "?external_reference=" + codificar(referencia)
                + "&begin_date=" + codificar(desde.withOffsetSameInstant(ZoneOffset.UTC).format(ISO))
                + "&end_date=" + codificar(hasta.withOffsetSameInstant(ZoneOffset.UTC).format(ISO));
        JsonNode raiz = enviar("GET", "/v1/orders" + consulta, null, null);
        JsonNode datos = raiz.path("data");
        if (datos.isArray()) {
            for (JsonNode orden : datos) {
                if (referencia.equals(texto(orden, "external_reference"))) {
                    return Optional.of(convertir(orden));
                }
            }
        }
        return Optional.empty();
    }

    /** Cancela una order que venció sin pagarse. */
    @Override
    public OrdenMercadoPago cancelarOrden(String idOrden, String claveIdempotencia) {
        return leerOrden(enviar("POST", "/v1/orders/" + codificar(idOrden) + "/cancel", null, claveIdempotencia));
    }

    /** Devuelve el dinero (pago aprobado pero sin asientos). */
    @Override
    public OrdenMercadoPago reembolsarOrden(String idOrden, String claveIdempotencia) {
        return leerOrden(enviar("POST", "/v1/orders/" + codificar(idOrden) + "/refund", null, claveIdempotencia));
    }


    /** Arma los datos que se envían para crear el pago. */
    ObjectNode construirCuerpoOrden(SolicitudOrden s) {
        return construirCuerpoOrden(s, true);
    }

    ObjectNode construirCuerpoOrden(SolicitudOrden s, boolean conDatosAdicionales) {
        BigDecimal importe = s.monto();
        if (importe == null || importe.signum() <= 0 || importe.stripTrailingZeros().scale() > 2) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, 0,
                    "invalid_transaction_amount", "El importe de la order no es válido.", null);
        }
        if (s.token() == null || s.token().isBlank()) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, 0,
                    "missing_payment_token", "Falta el token de pago.", null);
        }
        String monto = importe.setScale(2, RoundingMode.UNNECESSARY).toPlainString();

        ObjectNode cuerpo = json.createObjectNode();
        cuerpo.put("type", "online");
        cuerpo.put("processing_mode", "automatic");
        cuerpo.put("total_amount", monto);
        cuerpo.put("external_reference", s.referenciaExterna());
        if (s.descripcion() != null) {
            cuerpo.put("description", s.descripcion());
        }

        ObjectNode pagador = cuerpo.putObject("payer");
        pagador.put("email", s.emailPagador());
        if (conDatosAdicionales) {
            if (s.nombrePagador() != null && !s.nombrePagador().isBlank()) {
                pagador.put("first_name", s.nombrePagador().strip());
            }
            if (s.apellidoPagador() != null && !s.apellidoPagador().isBlank()) {
                pagador.put("last_name", s.apellidoPagador().strip());
            }
        }
        if (s.tipoDocumentoPagador() != null && s.numeroDocumentoPagador() != null) {
            ObjectNode identificacion = pagador.putObject("identification");
            // El tipo de documento ya lo validó DocumentoPagador: se envía tal cual.
            identificacion.put("type", s.tipoDocumentoPagador());
            identificacion.put("number", s.numeroDocumentoPagador());
        }
        if (s.celularPagador() != null) {
            // Dato que pide Mercado Pago para Yape.
            pagador.put("entity_type", "individual");
            ObjectNode telefono = pagador.putObject("phone");
            telefono.put("area_code", "51");
            telefono.put("number", s.celularPagador());
        }

        if (conDatosAdicionales && s.tituloItem() != null && !s.tituloItem().isBlank()) {
            ObjectNode item = cuerpo.putArray("items").addObject();
            item.put("title", s.tituloItem().strip());
            item.put("unit_price", monto);
            item.put("quantity", 1);
        }

        ArrayNode pagos = cuerpo.putObject("transactions").putArray("payments");
        ObjectNode pago = pagos.addObject();
        pago.put("amount", monto);
        ObjectNode metodo = pago.putObject("payment_method");
        metodo.put("id", s.metodoPagoId());
        metodo.put("type", s.metodoPagoTipo());
        metodo.put("token", s.token());
        // Yape no lleva cuotas ("installments"); solo las tarjetas.
        if (!"yape".equals(s.metodoPagoId())) {
            metodo.put("installments", s.cuotas());
            if (conDatosAdicionales) {
                metodo.put("statement_descriptor", DESCRIPTOR_RESUMEN);
            }
        }

        // Verificación 3DS (solo tarjetas): con on_fraud_risk se pide liability_shift=required; con never no se
        // envía nada.
        if (s.validacion3ds() != null && !"never".equals(s.validacion3ds())) {
            ObjectNode seguridad = cuerpo.putObject("config").putObject("online").putObject("transaction_security");
            seguridad.put("validation", s.validacion3ds());
            seguridad.put("liability_shift", "required");
        }
        return cuerpo;
    }


    private JsonNode enviar(String metodo, String ruta, String cuerpo, String claveIdempotencia) {
        return enviar(metodo, ruta, cuerpo, claveIdempotencia, null);
    }

    private JsonNode enviar(String metodo, String ruta, String cuerpo, String claveIdempotencia, String deviceId) {
        if (!configurado()) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.NO_CONFIGURADO,
                    "Mercado Pago no está configurado para este entorno (falta su Access Token).");
        }
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(urlBase + ruta))
                .timeout(timeout)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .header("User-Agent", "rutalibre-backend/1.0");
        if (claveIdempotencia != null) {
            b.header("X-Idempotency-Key", claveIdempotencia);
        }
        if (deviceId != null && !deviceId.isBlank()) {
            b.header("X-meli-session-id", deviceId.strip());
        }
        if ("GET".equals(metodo)) {
            b.GET();
        } else {
            b.header("Content-Type", "application/json");
            b.method(metodo, cuerpo == null ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(cuerpo, StandardCharsets.UTF_8));
        }

        HttpResponse<String> respuesta;
        try {
            respuesta = http.send(b.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            log.warn("Mercado Pago no respondió ({} {}): {}", metodo, rutaSegura(ruta), e.getClass().getSimpleName());
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO,
                    "No se obtuvo respuesta de Mercado Pago.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO,
                    "Consulta a Mercado Pago interrumpida.");
        }
        String idSolicitud = respuesta.headers().firstValue("x-request-id").orElse(null);
        if ("POST".equals(metodo) && (respuesta.statusCode() == 400 || respuesta.statusCode() == 422)) {
            log.warn("Detalle para soporte de Mercado Pago (sanitizado) x-request-id={}: solicitud={} respuesta={}",
                    idSolicitud, sanitizarParaSoporte(cuerpo), sanitizarParaSoporte(respuesta.body()));
        }
        return interpretar(metodo, ruta, respuesta.statusCode(), respuesta.body(), idSolicitud);
    }

    static String sanitizarParaSoporte(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto
                .replaceAll("(\"(?:token|number|email|first_name|last_name)\"\\s*:\\s*\")[^\"]*(\")", "$1***$2")
                .replaceAll("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+", "***@***")
                .replaceAll("\\d{6,}", "***");
        return limpio.length() <= 2000 ? limpio : limpio.substring(0, 2000);
    }

    JsonNode interpretar(String metodo, String ruta, int estado, String cuerpo) {
        return interpretar(metodo, ruta, estado, cuerpo, null);
    }

    JsonNode interpretar(String metodo, String ruta, int estado, String cuerpo, String idSolicitud) {
        JsonNode raiz = leerJson(cuerpo);
        if (estado >= 200 && estado < 300) {
            if (raiz == null) {
                throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, estado,
                        null, "Respuesta de Mercado Pago no válida.", null);
            }
            return raiz;
        }

        String codigo = raiz == null ? null : codigoError(raiz);
        String detalle = raiz == null ? null : detalleError(raiz);
        // El detalle del error dice qué campo rechazó Mercado Pago; x-request-id sirve para pedir soporte.
        log.warn("Mercado Pago respondió HTTP {} a {} {} (código: {}, detalle: {}, estructura: {}, x-request-id: {})",
                estado, metodo, rutaSegura(ruta), codigo, detalle, estructuraRespuesta(raiz, cuerpo), idSolicitud);

        // Los errores 402/422 pueden traer la order fallida (en la raíz o dentro de "data").
        OrdenMercadoPago adjunta = raiz == null ? null : ordenDeError(raiz);

        if (estado == 402) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.PAGO_RECHAZADO, estado, codigo,
                    "Mercado Pago no pudo procesar el pago.", adjunta, detalle);
        }
        if (estado == 404) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.NO_ENCONTRADO, estado, codigo,
                    "La order no existe en Mercado Pago.", null, detalle);
        }
        // 423 (otra solicitud igual en curso), 429 (demasiadas solicitudes) o 5xx: el resultado es desconocido y
        // se reintenta después.
        if (estado == 423 || estado == 429 || estado >= 500) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, estado, codigo,
                    "Mercado Pago no está disponible en este momento.", null, detalle);
        }
        // 422 con una order fallida = el medio de pago fue rechazado. Cualquier otro 4xx es un error de
        // integración nuestro.
        if (estado == 422 && adjunta != null && adjunta.fallidaOCerrada()) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.PAGO_RECHAZADO, estado, codigo,
                    "Mercado Pago no pudo procesar el pago.", adjunta, detalle);
        }
        throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, estado, codigo,
                "Mercado Pago rechazó la solicitud.", null, detalle);
    }

    private OrdenMercadoPago ordenDeError(JsonNode raiz) {
        if (raiz.hasNonNull("id") && raiz.hasNonNull("status")) {
            return convertir(raiz);
        }
        JsonNode datos = raiz.path("data");
        if (datos.hasNonNull("id") && datos.hasNonNull("status")) {
            return convertir(datos);
        }
        return null;
    }

    private OrdenMercadoPago leerOrden(JsonNode raiz) {
        if (!raiz.hasNonNull("id")) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO,
                    "La respuesta de Mercado Pago no contiene una order.");
        }
        return convertir(raiz);
    }

    OrdenMercadoPago convertir(JsonNode o) {
        JsonNode pago = o.path("transactions").path("payments").path(0);
        return new OrdenMercadoPago(
                texto(o, "id"),
                texto(o, "status"),
                texto(o, "status_detail"),
                texto(o, "external_reference"),
                decimal(o, "total_amount"),
                decimal(o, "total_paid_amount"),
                texto(o, "currency"),
                pago.isMissingNode() ? null : texto(pago, "id"),
                pago.isMissingNode() ? null : texto(pago, "status"),
                pago.isMissingNode() ? null : texto(pago, "status_detail"),
                pago.isMissingNode() ? null
                        : texto(pago.path("payment_method").path("transaction_security"), "url"));
    }

    private JsonNode leerJson(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) {
            return null;
        }
        try {
            return json.readTree(cuerpo);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String codigoError(JsonNode raiz) {
        JsonNode errores = raiz.path("errors");
        if (errores.isArray() && !errores.isEmpty()) {
            return texto(errores.get(0), "code");
        }
        String codigo = texto(raiz, "code");
        return codigo != null ? codigo : texto(raiz, "error");
    }

    private static final int MAX_DETALLE = 300;
    private static final String DESCRIPTOR_RESUMEN = "RUTALIBRE";

    /**
     * Resume el mensaje de error para el log: lo acorta y oculta correos y números largos (documentos, teléfonos).
     */
    /** Resume la forma del error para el log, sin datos del pagador. */
    private static final String[] CAMPOS_CONOCIDOS = { "status", "error", "message", "cause", "errors", "data",
            "id", "code", "type", "details" };

    static String estructuraRespuesta(JsonNode raiz, String cuerpo) {
        if (raiz == null) {
            return "cuerpo no JSON o vacío (" + (cuerpo == null ? 0 : cuerpo.length()) + " caracteres)";
        }
        if (!raiz.isObject()) {
            return "JSON no objeto";
        }
        // Solo se revisan nombres de campo conocidos.
        StringBuilder sb = new StringBuilder("campos=[");
        boolean primero = true;
        for (String nombre : CAMPOS_CONOCIDOS) {
            if (raiz.has(nombre)) {
                sb.append(primero ? "" : ",").append(nombre);
                primero = false;
            }
        }
        sb.append(']');
        JsonNode errores = raiz.path("errors");
        if (errores.isArray()) {
            sb.append(", errors=").append(errores.size()).append(" códigos=[");
            boolean p = true;
            for (JsonNode e : errores) {
                String c = texto(e, "code");
                if (c != null) {
                    sb.append(p ? "" : ",").append(c.replaceAll("[^\\w.-]", "_"));
                    p = false;
                }
            }
            sb.append(']');
        }
        String causa = texto(raiz, "error");
        if (causa != null) {
            sb.append(", error=").append(causa.replaceAll("[^\\w. -]", "_"));
        }
        return sb.toString();
    }

    static String detalleError(JsonNode raiz) {
        JsonNode errores = raiz.path("errors");
        JsonNode primero = errores.isArray() && !errores.isEmpty() ? errores.get(0) : raiz;
        StringBuilder sb = new StringBuilder();
        String mensaje = texto(primero, "message");
        if (mensaje != null) {
            sb.append(mensaje);
        }
        JsonNode detalles = primero.path("details");
        if (detalles.isArray()) {
            for (JsonNode d : detalles) {
                if (sb.length() > 0) {
                    sb.append(" | ");
                }
                sb.append((d.isObject() || d.isArray()) ? d.toString() : d.asText());
            }
        } else if (!detalles.isMissingNode() && !detalles.isNull()) {
            if (sb.length() > 0) {
                sb.append(" | ");
            }
            sb.append((detalles.isObject() || detalles.isArray())
                    ? detalles.toString()
                    : detalles.asText());
        }
        if (sb.length() == 0) {
            return null;
        }
        String resumen = sb.toString().replaceAll("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+", "***@***")
                .replaceAll("\\d{6,}", "***");
        return resumen.length() <= MAX_DETALLE ? resumen : resumen.substring(0, MAX_DETALLE);
    }

    static String texto(JsonNode nodo, String campo) {
        JsonNode v = nodo == null ? null : nodo.get(campo);
        return v == null || v.isNull() || v.isMissingNode() ? null : v.asText();
    }

    private static BigDecimal decimal(JsonNode nodo, String campo) {
        String v = texto(nodo, campo);
        if (v == null || v.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(v.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String codificar(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }

    /** Ruta sin parámetros de consulta, para el log (no aportan y pueden traer datos). */
    private static String rutaSegura(String ruta) {
        int i = ruta.indexOf('?');
        return i < 0 ? ruta : ruta.substring(0, i);
    }
}