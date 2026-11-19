package com.transportes.pagos.culqi;

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
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.pagos.configuracion.CredencialesCulqi;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Component
public class ClienteCulqiHttp implements ClienteCulqi {

    private static final Logger log = LoggerFactory.getLogger(ClienteCulqiHttp.class);
    private static final int MAX_DESCRIPCION = 80;
    private static final String CLAVE_REFERENCIA = "referencia";

    private final String llaveSecreta;
    private final String urlBase;
    private final Duration timeout;
    private final ObjectMapper json;
    private final HttpClient http;

    @Autowired
    public ClienteCulqiHttp(CredencialesCulqi credenciales,
            @Value("${culqi.url-api:https://api.culqi.com/v2}") String urlBase,
            @Value("${culqi.timeout-segundos:20}") long timeoutSegundos,
            ObjectMapper json) {
        this(credenciales.disponible() ? credenciales.llaveSecreta() : "", urlBase, timeoutSegundos, json);
    }

    public ClienteCulqiHttp(String llaveSecreta, String urlBase, long timeoutSegundos, ObjectMapper json) {
        this.llaveSecreta = llaveSecreta == null ? "" : llaveSecreta.strip();
        this.urlBase = urlBase.replaceAll("/+$", "");
        this.timeout = Duration.ofSeconds(timeoutSegundos);
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    }

    @Override
    public boolean configurado() {
        return !llaveSecreta.isEmpty();
    }

    @Override
    public CargoCulqi crearCargo(SolicitudCargo solicitud) {
        JsonNode raiz = enviar("POST", "/charges", construirCuerpoCargo(solicitud).toString());
        if ("REVIEW".equals(texto(raiz, "action_code")) && !raiz.hasNonNull("id")) {
            return CargoCulqi.pendiente3ds(texto(raiz, "user_message"));
        }
        return leerCargo(raiz);
    }

    @Override
    public CargoCulqi consultarCargo(String idCargo) {
        return leerCargo(enviar("GET", "/charges/" + codificar(idCargo), null));
    }

    @Override
    public Optional<CargoCulqi> buscarPorReferencia(String referenciaExterna, String email, OffsetDateTime desde,
                                                    OffsetDateTime hasta) {
        StringBuilder consulta = new StringBuilder("?limit=100")
                .append("&creation_date_from=").append(desde.toEpochSecond())
                .append("&creation_date_to=").append(hasta.toEpochSecond());
        if (email != null && !email.isBlank()) {
            consulta.append("&email=").append(codificar(email.strip()));
        }
        JsonNode raiz = enviar("GET", "/charges" + consulta, null);
        JsonNode datos = raiz.path("data");
        if (datos.isArray()) {
            for (JsonNode cargo : datos) {
                if (referenciaExterna.equals(texto(cargo.path("metadata"), CLAVE_REFERENCIA))) {
                    return Optional.of(convertir(cargo));
                }
            }
        }
        return Optional.empty();
    }

    @Override
    public String reembolsar(String idCargo, BigDecimal monto, String motivo) {
        ObjectNode cuerpo = json.createObjectNode();
        cuerpo.put("amount", enCentimos(monto));
        cuerpo.put("charge_id", idCargo);
        cuerpo.put("reason", motivo);
        JsonNode raiz = enviar("POST", "/refunds", cuerpo.toString());
        String id = texto(raiz, "id");
        if (id == null) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO,
                    "La respuesta de Culqi no contiene la devolución.");
        }
        return id;
    }

    ObjectNode construirCuerpoCargo(SolicitudCargo s) {
        if (s.monto() == null || s.monto().signum() <= 0 || s.monto().stripTrailingZeros().scale() > 2) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.SOLICITUD_INVALIDA, 0, "invalid_amount",
                    "El importe del cargo no es válido.", null, null, null);
        }
        if (s.token() == null || s.token().isBlank()) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.SOLICITUD_INVALIDA, 0, "missing_token",
                    "Falta el token de pago.", null, null, null);
        }
        ObjectNode cuerpo = json.createObjectNode();
        cuerpo.put("amount", enCentimos(s.monto()));
        cuerpo.put("currency_code", s.moneda());
        cuerpo.put("email", s.email());
        cuerpo.put("source_id", s.token());
        cuerpo.put("capture", true);
        if (s.descripcion() != null && !s.descripcion().isBlank()) {
            String d = s.descripcion().strip();
            cuerpo.put("description", d.length() <= MAX_DESCRIPCION ? d : d.substring(0, MAX_DESCRIPCION));
        }
        cuerpo.putObject("metadata").put(CLAVE_REFERENCIA, s.referenciaExterna());

        ObjectNode antifraude = json.createObjectNode();
        antifraude.put("country_code", "PE");
        if (noVacio(s.nombre())) {
            antifraude.put("first_name", s.nombre().strip());
        }
        if (noVacio(s.apellido())) {
            antifraude.put("last_name", s.apellido().strip());
        }
        if (s.telefono() != null && s.telefono().matches("\\d{7,15}")) {
            antifraude.put("phone_number", s.telefono());
        }
        cuerpo.set("antifraud_details", antifraude);

        Autenticacion3ds a = s.autenticacion3ds();
        if (a != null) {
            ObjectNode tres = cuerpo.putObject("authentication_3DS");
            tres.put("eci", a.eci());
            tres.put("xid", a.xid());
            tres.put("cavv", a.cavv());
            tres.put("protocolVersion", a.protocolVersion());
            tres.put("directoryServerTransactionId", a.directoryServerTransactionId());
        }
        return cuerpo;
    }

    private JsonNode enviar(String metodo, String ruta, String cuerpo) {
        if (!configurado()) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.NO_CONFIGURADO,
                    "Culqi no está configurado (falta la llave secreta).");
        }
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(urlBase + ruta))
                .timeout(timeout)
                .header("Authorization", "Bearer " + llaveSecreta)
                .header("Accept", "application/json")
                .header("User-Agent", "rutalibre-backend/1.0");
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
            log.warn("Culqi no respondió ({} {}): {}", metodo, rutaSegura(ruta), e.getClass().getSimpleName());
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO,
                    "No se obtuvo respuesta de Culqi.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO,
                    "Consulta a Culqi interrumpida.");
        }
        return interpretar(metodo, ruta, respuesta.statusCode(), respuesta.body());
    }

    JsonNode interpretar(String metodo, String ruta, int estado, String cuerpo) {
        JsonNode raiz = leerJson(cuerpo);
        if (estado >= 200 && estado < 300) {
            if (raiz == null) {
                throw new ErrorCulqiException(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO, estado, null,
                        "Respuesta de Culqi no válida.", null, null, null);
            }
            return raiz;
        }

        String tipoError = raiz == null ? null : texto(raiz, "type");
        String codigo = raiz == null ? null : codigoError(raiz);
        String mensajeUsuario = raiz == null ? null : texto(raiz, "user_message");
        String idCargo = raiz == null ? null : texto(raiz, "charge_id");
        String detalle = raiz == null ? null : resumir(texto(raiz, "merchant_message"));
        log.warn("Culqi respondió HTTP {} a {} {} (tipo: {}, código: {}, detalle: {})", estado, metodo,
                rutaSegura(ruta), tipoError, codigo, detalle);

        if ("card_error".equals(tipoError) || estado == 402) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.PAGO_RECHAZADO, estado, codigo,
                    "Culqi no pudo procesar el pago.", mensajeUsuario, idCargo, detalle);
        }
        if (estado == 404) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.NO_ENCONTRADO, estado, codigo,
                    "No existe en Culqi lo solicitado.", mensajeUsuario, null, detalle);
        }
        if (estado == 408 || estado == 409 || estado == 429 || estado >= 500) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO, estado, codigo,
                    "Culqi no está disponible en este momento.", mensajeUsuario, null, detalle);
        }
        throw new ErrorCulqiException(ErrorCulqiException.Tipo.SOLICITUD_INVALIDA, estado, codigo,
                "Culqi rechazó la solicitud.", mensajeUsuario, null, detalle);
    }

    private CargoCulqi leerCargo(JsonNode raiz) {
        if (!raiz.hasNonNull("id")) {
            throw new ErrorCulqiException(ErrorCulqiException.Tipo.RESULTADO_DESCONOCIDO,
                    "La respuesta de Culqi no contiene un cargo.");
        }
        return convertir(raiz);
    }

    CargoCulqi convertir(JsonNode c) {
        JsonNode resultado = c.path("outcome");
        return new CargoCulqi(
                texto(c, "id"),
                texto(resultado, "type"),
                texto(resultado, "code"),
                texto(resultado, "user_message"),
                texto(c.path("metadata"), CLAVE_REFERENCIA),
                aSoles(texto(c, "amount")),
                aSoles(texto(c, "amount_refunded")),
                texto(c, "currency_code"),
                !"false".equals(texto(c, "capture")),
                false);
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
        String decline = texto(raiz, "decline_code");
        return decline != null ? decline : texto(raiz, "code");
    }

    private static String resumir(String mensaje) {
        if (mensaje == null) {
            return null;
        }
        String limpio = mensaje.replaceAll("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+", "***@***").replaceAll("\\d{6,}", "***");
        return limpio.length() <= 300 ? limpio : limpio.substring(0, 300);
    }

    static String texto(JsonNode nodo, String campo) {
        JsonNode v = nodo == null ? null : nodo.get(campo);
        return v == null || v.isNull() || v.isMissingNode() ? null : v.asText();
    }

    static BigDecimal aSoles(String centimos) {
        if (centimos == null || centimos.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(centimos.trim()).movePointLeft(2).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static long enCentimos(BigDecimal soles) {
        return soles.setScale(2, RoundingMode.UNNECESSARY).movePointRight(2).longValueExact();
    }

    private static boolean noVacio(String valor) {
        return valor != null && !valor.isBlank();
    }

    private static String codificar(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }

    private static String rutaSegura(String ruta) {
        int i = ruta.indexOf('?');
        return i < 0 ? ruta : ruta.substring(0, i);
    }
}
