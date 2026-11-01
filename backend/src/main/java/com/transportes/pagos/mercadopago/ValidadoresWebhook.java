package com.transportes.pagos.mercadopago;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.pagos.configuracion.CredencialesMercadoPago;
import com.transportes.pagos.entidades.EntornoPago;

/**
 * Validadores de la firma {@code x-signature} de los Webhooks, uno por entorno (cada uno con su clave secreta).
 *
 * <p>Una notificación solo se acepta si su firma coincide con la clave de alguno de los entornos CANDIDATOS. Con la
 * URL de un entorno ({@code /api/pagos/webhook/sandbox} o {@code /production}) el único candidato es ese entorno;
 * con la URL heredada ({@code /api/pagos/webhook}) los candidatos son ambos.</p>
 */
@Component
public class ValidadoresWebhook {

    private final Map<EntornoPago, ValidadorFirmaWebhook> validadores = new EnumMap<>(EntornoPago.class);

    public ValidadoresWebhook(CredencialesMercadoPago credenciales,
            @Value("${mercadopago.webhook-tolerancia-segundos:0}") long toleranciaSegundos) {
        for (EntornoPago entorno : EntornoPago.values()) {
            validadores.put(entorno,
                    new ValidadorFirmaWebhook(credenciales.de(entorno).webhookSecret(), toleranciaSegundos));
        }
    }

    public ValidadorFirmaWebhook de(EntornoPago entorno) {
        return validadores.get(entorno);
    }

    /** ¿Alguno de los candidatos tiene clave secreta de Webhooks configurada? */
    public boolean algunoConfigurado(Collection<EntornoPago> candidatos) {
        for (EntornoPago entorno : candidatos) {
            if (de(entorno).configurado()) {
                return true;
            }
        }
        return false;
    }

    /** Candidatos cuya clave secreta produce exactamente la firma recibida (vacío = firma inválida). */
    public List<EntornoPago> entornosConFirmaValida(Collection<EntornoPago> candidatos, String firma,
            String idSolicitud, String dataId) {
        List<EntornoPago> validos = new ArrayList<>();
        for (EntornoPago entorno : candidatos) {
            if (de(entorno).esValida(firma, idSolicitud, dataId)) {
                validos.add(entorno);
            }
        }
        return validos;
    }

    /** Motivo del rechazo, sin revelar claves ni firmas (solo para el registro del servidor). */
    public String diagnosticar(Collection<EntornoPago> candidatos, String firma, String idSolicitud, String dataId) {
        StringBuilder sb = new StringBuilder();
        for (EntornoPago entorno : candidatos) {
            if (sb.length() > 0) {
                sb.append(" | ");
            }
            sb.append(entorno).append(": ").append(de(entorno).diagnosticar(firma, idSolicitud, dataId));
        }
        return sb.toString();
    }
}
