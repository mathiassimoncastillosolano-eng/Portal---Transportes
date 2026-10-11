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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Cliente HTTP de la API de Orders de Mercado Pago (https://api.mercadopago.com/v1/orders).
 *
 * <p>Usa el {@link HttpClient} del JDK, igual que la integración de correo, para no agregar dependencias.
 * El Access Token llega por la variable de entorno {@code MERCADOPAGO_ACCESS_TOKEN}, solo viaja en la cabecera
 * Authorization y nunca se registra. Los cuerpos de respuesta tampoco se registran completos: pueden traer
 * datos del pagador.</p>
 */
@Component
public class ClienteMercadoPagoHttp implements ClienteMercadoPago {

    private static final Logger log = LoggerFactory.getLogger(ClienteMercadoPagoHttp.class);
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final String accessToken;
    private final String urlBase;
    private final Duration timeout;
    private final ObjectMapper json;
    private final HttpClient http;

    public ClienteMercadoPagoHttp(@Value("${mercadopago.access-token:}") String accessToken,
                                  @Value("${mercadopago.url-api:https://api.mercadopago.com}") String urlBase,
                                  @Value("${mercadopago.timeout-segundos:20}") long timeoutSegundos,
                                  ObjectMapper json) {
        this.accessToken = accessToken == null ? "" : accessToken.strip();
        this.urlBase = urlBase.replaceAll("/+$", "");
        this.timeout = Duration.ofSeconds(timeoutSegundos);
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    }

    @Override
    public boolean configurado() {
        return !accessToken.isEmpty();
    }

    @Override
    public OrdenMercadoPago crearOrden(SolicitudOrden s, String claveIdempotencia) {
        return leerOrden(enviar("POST", "/v1/orders", construirCuerpoOrden(s).toString(), claveIdempotencia));
    }

    @Override
    public OrdenMercadoPago consultarOrden(String idOrden) {
        return leerOrden(enviar("GET", "/v1/orders/" + codificar(idOrden), null, null));
    }

    @Override
    public Optional<OrdenMercadoPago> buscarPorReferencia(String referencia, OffsetDateTime desde, OffsetDateTime hasta) {
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

    @Override
    public OrdenMercadoPago cancelarOrden(String idOrden, String claveIdempotencia) {
        return leerOrden(enviar("POST", "/v1/orders/" + codificar(idOrden) + "/cancel", null, claveIdempotencia));
    }

    @Override
    public OrdenMercadoPago reembolsarOrden(String idOrden, String claveIdempotencia) {
        return leerOrden(enviar("POST", "/v1/orders/" + codificar(idOrden) + "/refund", null, claveIdempotencia));
    }

    // ------------------------------------------------------------------ cuerpo de la order

    /** Cuerpo de POST /v1/orders según la documentación de Checkout API vía Orders (Perú). */
    ObjectNode construirCuerpoOrden(SolicitudOrden s) {
        String monto = s.monto().setScale(2, RoundingMode.UNNECESSARY).toPlainString();

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
        if (s.tipoDocumentoPagador() != null && s.numeroDocumentoPagador() != null) {
            ObjectNode identificacion = pagador.putObject("identification");
            identificacion.put("type", s.tipoDocumentoPagador());
            identificacion.put("number", s.numeroDocumentoPagador());
        }
        if (s.celularPagador() != null) {
            ObjectNode telefono = pagador.putObject("phone");
            telefono.put("area_code", "51");
            telefono.put("number", s.celularPagador());
        }

        ArrayNode pagos = cuerpo.putObject("transactions").putArray("payments");
        ObjectNode pago = pagos.addObject();
        pago.put("amount", monto);
        ObjectNode metodo = pago.putObject("payment_method");
        metodo.put("id", s.metodoPagoId());
        metodo.put("type", s.metodoPagoTipo());
        metodo.put("token", s.token());
        metodo.put("installments", s.cuotas());

        // 3DS 2.0 (solo tarjetas): on_fraud_risk exige liability_shift=required; con "never" no se envía nada.
        if (s.validacion3ds() != null && !"never".equals(s.validacion3ds())) {
            ObjectNode seguridad = cuerpo.putObject("config").putObject("online").putObject("transaction_security");
            seguridad.put("validation", s.validacion3ds());
            seguridad.put("liability_shift", "required");
        }
        return cuerpo;
    }

    // ------------------------------------------------------------------ HTTP

    private JsonNode enviar(String metodo, String ruta, String cuerpo, String claveIdempotencia) {
        if (!configurado()) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.NO_CONFIGURADO,
                    "Mercado Pago no está configurado (MERCADOPAGO_ACCESS_TOKEN).");
        }
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(urlBase + ruta))
                .timeout(timeout)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .header("User-Agent", "rutalibre-backend/1.0");
        if (claveIdempotencia != null) {
            b.header("X-Idempotency-Key", claveIdempotencia);
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
        return interpretar(metodo, ruta, respuesta.statusCode(), respuesta.body());
    }

    JsonNode interpretar(String metodo, String ruta, int estado, String cuerpo) {
        JsonNode raiz = leerJson(cuerpo);
        if (estado >= 200 && estado < 300) {
            if (raiz == null) {
                throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, estado,
                        null, "Respuesta de Mercado Pago no válida.", null);
            }
            return raiz;
        }

        String codigo = raiz == null ? null : codigoError(raiz);
        log.warn("Mercado Pago respondió HTTP {} a {} {} (código: {})", estado, metodo, rutaSegura(ruta), codigo);

        if (estado == 402) {
            OrdenMercadoPago adjunta = raiz != null && raiz.hasNonNull("id") && raiz.hasNonNull("status") ? convertir(raiz) : null;
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.PAGO_RECHAZADO, estado, codigo,
                    "Mercado Pago no pudo procesar el pago.", adjunta);
        }
        if (estado == 404) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.NO_ENCONTRADO, estado, codigo,
                    "La order no existe en Mercado Pago.", null);
        }
        // 423 resource_locked: otra solicitud con la misma clave sigue en curso. 429/5xx: reintentar más tarde.
        if (estado == 423 || estado == 429 || estado >= 500) {
            throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.RESULTADO_DESCONOCIDO, estado, codigo,
                    "Mercado Pago no está disponible en este momento.", null);
        }
        throw new ErrorMercadoPagoException(ErrorMercadoPagoException.Tipo.SOLICITUD_INVALIDA, estado, codigo,
                "Mercado Pago rechazó la solicitud.", null);
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

    /** Sin parámetros de consulta: pueden contener la referencia y fechas, que no aportan al diagnóstico. */
    private static String rutaSegura(String ruta) {
        int i = ruta.indexOf('?');
        return i < 0 ? ruta : ruta.substring(0, i);
    }
}
