package com.transportes.pagos.controladores;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.pagos.mercadopago.ErrorMercadoPagoException;
import com.transportes.pagos.mercadopago.ValidadorFirmaWebhook;
import com.transportes.pagos.servicios.PagoServicio;

/**
 * Notificaciones Webhook del evento "Order (Mercado Pago)". URL pública: {@code https://<backend>/api/pagos/webhook}.
 *
 * <p>Reglas: (1) se verifica la firma {@code x-signature} con la clave secreta de la aplicación; sin firma válida
 * se responde 401 y no se hace nada; (2) el cuerpo NO se usa para decidir: solo se toma {@code data.id} y se consulta
 * la order con GET /v1/orders/{id}; (3) se responde 200 rápido; si Mercado Pago no respondió a la consulta, 503
 * para que reintente. Las notificaciones repetidas o desordenadas no tienen efecto adicional (ver PagoServicio).</p>
 */
@RestController
@RequestMapping("/api/pagos/webhook")
public class WebhookMercadoPagoControlador {

    private static final Logger log = LoggerFactory.getLogger(WebhookMercadoPagoControlador.class);

    private final ValidadorFirmaWebhook validador;
    private final PagoServicio pagoServicio;

    public WebhookMercadoPagoControlador(ValidadorFirmaWebhook validador, PagoServicio pagoServicio) {
        this.validador = validador;
        this.pagoServicio = pagoServicio;
    }

    @PostMapping
    public ResponseEntity<Void> recibir(
            @RequestHeader(value = "x-signature", required = false) String firma,
            @RequestHeader(value = "x-request-id", required = false) String idSolicitud,
            @RequestParam(value = "data.id", required = false) String dataIdConsulta,
            @RequestParam(value = "type", required = false) String tipoConsulta,
            @RequestBody(required = false) Map<String, Object> cuerpo) {

        if (!validador.configurado()) {
            log.error("Webhook recibido pero MERCADOPAGO_WEBHOOK_SECRET no está configurado: se rechaza");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // La firma se calcula con data.id de la URL (como el SDK oficial). El id del cuerpo solo es respaldo
        // para identificar la order, y aun así la order se consulta en la API antes de usarla.
        if (!validador.esValida(firma, idSolicitud, dataIdConsulta)) {
            log.warn("Webhook con firma inválida rechazado (x-request-id={})", idSolicitud);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String dataId = dataIdConsulta != null ? dataIdConsulta : idDelCuerpo(cuerpo);
        String tipo = tipoConsulta != null ? tipoConsulta : (cuerpo == null ? null : String.valueOf(cuerpo.get("type")));
        if (!"order".equalsIgnoreCase(tipo) || dataId == null || dataId.isBlank()) {
            log.info("Webhook ignorado (tipo={})", tipo);
            return ResponseEntity.ok().build();
        }
        try {
            pagoServicio.procesarNotificacionOrden(dataId.trim());
            return ResponseEntity.ok().build();
        } catch (ErrorMercadoPagoException e) {
            log.warn("Webhook de la order {}: Mercado Pago no respondió la consulta ({}); se espera reintento", dataId, e.getTipo());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    @SuppressWarnings("unchecked")
    private static String idDelCuerpo(Map<String, Object> cuerpo) {
        if (cuerpo == null || !(cuerpo.get("data") instanceof Map<?, ?> data)) {
            return null;
        }
        Object id = ((Map<String, Object>) data).get("id");
        return id == null ? null : String.valueOf(id);
    }
}
