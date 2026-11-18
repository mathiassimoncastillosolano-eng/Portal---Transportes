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
 * Recibe los avisos que manda Mercado Pago cuando cambia un pago. Revisa la firma y consulta el estado real del
 * pago.
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

    /** Recibe un aviso en la dirección general. */
    @PostMapping
    public ResponseEntity<Void> recibir(
            @RequestHeader(value = "x-signature", required = false) String firma,
            @RequestHeader(value = "x-request-id", required = false) String idSolicitud,
            @RequestParam(value = "data.id", required = false) String dataIdConsulta,
            @RequestParam(value = "type", required = false) String tipoConsulta,
            @RequestBody(required = false) Map<String, Object> cuerpo) {
        return procesar(AMBOS, firma, idSolicitud, dataIdConsulta, tipoConsulta, cuerpo);
    }

    /** Recibe un aviso de un entorno concreto. */
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
        // Revisa la firma del aviso.
        List<EntornoPago> validos = validadores.entornosConFirmaValida(candidatos, firma, idSolicitud, dataIdConsulta);
        if (validos.isEmpty()) {
            // Firma inválida: se anota en el log y se rechaza.
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
            // La firma es válida pero el id no es de un pago real: se ignora.
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
