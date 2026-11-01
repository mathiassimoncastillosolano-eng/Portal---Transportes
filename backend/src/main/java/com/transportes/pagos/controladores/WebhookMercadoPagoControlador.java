package com.transportes.pagos.controladores;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.pagos.entidades.EntornoPago;
import com.transportes.pagos.mercadopago.ErrorMercadoPagoException;
import com.transportes.pagos.mercadopago.OrdenMercadoPago;
import com.transportes.pagos.mercadopago.ValidadoresWebhook;
import com.transportes.pagos.servicios.PagoServicio;

/**
 * Notificaciones Webhook del evento "Order (Mercado Pago)". URLs públicas:
 * <ul>
 *   <li>{@code https://<backend>/api/pagos/webhook/sandbox}: notificaciones del modo de pruebas;</li>
 *   <li>{@code https://<backend>/api/pagos/webhook/production}: notificaciones del modo productivo;</li>
 *   <li>{@code https://<backend>/api/pagos/webhook}: URL heredada; acepta la firma de cualquiera de los dos entornos
 *       (se conserva para no romper la configuración actual de Mercado Pago).</li>
 * </ul>
 *
 * <p>Reglas: (1) se verifica la firma {@code x-signature} con la clave secreta del entorno (o de los entornos
 * candidatos); sin firma válida se responde 401 y no se hace nada; (2) el cuerpo NO se usa para decidir: solo se toma
 * {@code data.id} y se consulta la order con GET /v1/orders/{id} usando las credenciales del entorno de la operación;
 * (3) se responde 200 rápido. Respuesta según el resultado, para no perder notificaciones válidas ni provocar
 * reintentos inútiles (Mercado Pago reintenta ante todo lo que no sea 200/201):
 * <ul>
 *   <li>id que no tiene forma de order (p. ej. 123456 del botón "Simular"): 200, sin consultar la API;</li>
 *   <li>fallo temporal de Mercado Pago o de nuestras credenciales (sin respuesta, 423/429/5xx, 401/403): 503, para
 *       que reintente;</li>
 *   <li>rechazo definitivo de la consulta (400 invalid_path_param, 404...): 200, repetirla no cambiaría nada.</li>
 * </ul>
 * Las notificaciones repetidas o desordenadas no tienen efecto adicional (ver PagoServicio).</p>
 */
@RestController
@RequestMapping("/api/pagos/webhook")
public class WebhookMercadoPagoControlador {

    private static final Logger log = LoggerFactory.getLogger(WebhookMercadoPagoControlador.class);
    private static final Set<EntornoPago> AMBOS = EnumSet.allOf(EntornoPago.class);

    private final ValidadoresWebhook validadores;
    private final PagoServicio pagoServicio;

    public WebhookMercadoPagoControlador(ValidadoresWebhook validadores, PagoServicio pagoServicio) {
        this.validadores = validadores;
        this.pagoServicio = pagoServicio;
    }

    /** URL heredada: la firma decide a qué entorno(s) pertenece la notificación. */
    @PostMapping
    public ResponseEntity<Void> recibir(
            @RequestHeader(value = "x-signature", required = false) String firma,
            @RequestHeader(value = "x-request-id", required = false) String idSolicitud,
            @RequestParam(value = "data.id", required = false) String dataIdConsulta,
            @RequestParam(value = "type", required = false) String tipoConsulta,
            @RequestBody(required = false) Map<String, Object> cuerpo) {
        return procesar(AMBOS, firma, idSolicitud, dataIdConsulta, tipoConsulta, cuerpo);
    }

    /** URL de un entorno concreto: solo vale la clave secreta de ese entorno. */
    @PostMapping("/{entorno}")
    public ResponseEntity<Void> recibirDeEntorno(
            @PathVariable("entorno") String entornoTexto,
            @RequestHeader(value = "x-signature", required = false) String firma,
            @RequestHeader(value = "x-request-id", required = false) String idSolicitud,
            @RequestParam(value = "data.id", required = false) String dataIdConsulta,
            @RequestParam(value = "type", required = false) String tipoConsulta,
            @RequestBody(required = false) Map<String, Object> cuerpo) {
        EntornoPago entorno = EntornoPago.desde(entornoTexto);
        if (entorno == null) {
            return ResponseEntity.notFound().build();
        }
        return procesar(EnumSet.of(entorno), firma, idSolicitud, dataIdConsulta, tipoConsulta, cuerpo);
    }

    private ResponseEntity<Void> procesar(Set<EntornoPago> candidatos, String firma, String idSolicitud,
            String dataIdConsulta, String tipoConsulta, Map<String, Object> cuerpo) {
        if (!validadores.algunoConfigurado(candidatos)) {
            log.error("Webhook recibido pero no hay clave secreta de Webhooks configurada para {}: se rechaza", candidatos);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // La firma se calcula con data.id de la URL (como el SDK oficial). El id del cuerpo solo es respaldo
        // para identificar la order, y aun así la order se consulta en la API antes de usarla.
        List<EntornoPago> validos = validadores.entornosConFirmaValida(candidatos, firma, idSolicitud, dataIdConsulta);
        if (validos.isEmpty()) {
            // Solo se indica qué datos llegaron (nunca la clave ni la firma): ayuda a distinguir una clave secreta
            // equivocada (p. ej. la del otro entorno) de una llamada que no viene de Mercado Pago.
            log.warn("Webhook con firma inválida rechazado (x-request-id={}, x-signature presente={}, data.id en la URL={}, diagnóstico: {})",
                    idSolicitud, firma != null && !firma.isBlank(), dataIdConsulta != null,
                    validadores.diagnosticar(candidatos, firma, idSolicitud, dataIdConsulta));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String dataId = dataIdConsulta != null ? dataIdConsulta : idDelCuerpo(cuerpo);
        Object tipoCuerpo = cuerpo == null ? null : cuerpo.get("type");
        String tipo = tipoConsulta != null ? tipoConsulta : (tipoCuerpo == null ? null : String.valueOf(tipoCuerpo));
        if (!"order".equalsIgnoreCase(tipo)) {
            log.info("Webhook ignorado (tipo={})", tipo);
            return ResponseEntity.ok().build();
        }
        String idOrden = OrdenMercadoPago.normalizarIdOrden(dataId);
        if (idOrden == null) {
            // Firma válida pero el id no es el de una order (prueba "Simular" con 123456, por ejemplo).
            log.info("Webhook de tipo order con un id que no corresponde a una order: se ignora sin consultar la API");
            return ResponseEntity.ok().build();
        }
        try {
            pagoServicio.procesarNotificacionOrden(idOrden, validos);
            return ResponseEntity.ok().build();
        } catch (ErrorMercadoPagoException e) {
            if (e.esReintentable()) {
                log.warn("Webhook de la order {}: no se pudo consultar en Mercado Pago ({}, HTTP {}); se espera reintento",
                        idOrden, e.getTipo(), e.getEstadoHttp());
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
            }
            log.warn("Webhook de la order {} descartado: Mercado Pago rechazó la consulta (HTTP {}, código {})",
                    idOrden, e.getEstadoHttp(), e.getCodigo());
            return ResponseEntity.ok().build();
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
