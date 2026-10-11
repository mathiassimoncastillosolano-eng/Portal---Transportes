package com.transportes.pagos.servicios;

import java.util.Map;

/** Mensajes comprensibles para los motivos de rechazo que devuelve Mercado Pago (tarjetas y Yape). */
final class MensajesPago {

    private static final String GENERICO = "El pago no fue aprobado. Puedes intentarlo de nuevo con otro medio de pago.";

    private static final Map<String, String> POR_MOTIVO = Map.ofEntries(
            Map.entry("cc_rejected_insufficient_amount", "La tarjeta no tiene fondos suficientes."),
            Map.entry("insufficient_amount", "El medio de pago no tiene fondos suficientes."),
            Map.entry("cc_rejected_bad_filled_security_code", "El código de seguridad de la tarjeta no es correcto."),
            Map.entry("cc_rejected_bad_filled_date", "La fecha de vencimiento de la tarjeta no es correcta."),
            Map.entry("cc_rejected_bad_filled_other", "Revisa los datos de la tarjeta e inténtalo de nuevo."),
            Map.entry("cc_rejected_bad_filled_card_number", "Revisa el número de la tarjeta."),
            Map.entry("bad_filled_card_data", "Revisa los datos ingresados e inténtalo de nuevo."),
            Map.entry("cc_rejected_call_for_authorize", "Debes autorizar este pago con el banco emisor antes de reintentar."),
            Map.entry("required_call_for_authorize", "Debes autorizar este pago con tu banco antes de reintentar."),
            Map.entry("cc_rejected_card_disabled", "La tarjeta está deshabilitada. Comunícate con tu banco."),
            Map.entry("cc_rejected_duplicated_payment", "Ya existe un pago igual reciente. Revisa tus movimientos antes de reintentar."),
            Map.entry("cc_rejected_high_risk", "El pago fue rechazado por seguridad. Usa otro medio de pago."),
            Map.entry("cc_rejected_blacklist", "El pago fue rechazado. Usa otro medio de pago."),
            Map.entry("cc_rejected_max_attempts", "Alcanzaste el límite de intentos. Usa otra tarjeta."),
            Map.entry("max_attempts_exceeded", "Alcanzaste el límite de intentos permitidos."),
            Map.entry("cc_rejected_invalid_installments", "La tarjeta no admite esa cantidad de cuotas."),
            Map.entry("cc_rejected_3ds_challenge", "No se completó la verificación de seguridad de tu banco."),
            Map.entry("invalid_card_token", "Los datos del medio de pago vencieron. Vuelve a ingresarlos."),
            Map.entry("processing_error", "Ocurrió un error al procesar el pago. Inténtalo de nuevo."),
            Map.entry("cc_rejected_other_reason", "Tu banco rechazó el pago. Intenta con otra tarjeta u otro medio."));

    private MensajesPago() {
    }

    static String rechazo(String motivo) {
        return motivo == null ? GENERICO : POR_MOTIVO.getOrDefault(motivo, GENERICO);
    }

    static final String EN_PROCESO =
            "Tu pago está en revisión. Te mostraremos el resultado apenas Mercado Pago lo confirme.";
    static final String VERIFICANDO =
            "Estamos verificando tu pago con Mercado Pago. No vuelvas a pagar mientras tanto.";
    static final String DESAFIO_3DS = "Tu banco solicita una verificación adicional para completar el pago.";
    static final String EXPIRADO = "El tiempo para completar el pago terminó y la operación se canceló.";
    static final String SIN_ASIENTOS = "Recibimos tu pago, pero tus asientos ya no estaban disponibles. "
            + "Estamos devolviendo el importe a tu medio de pago.";
    static final String REEMBOLSADO = "Tus asientos ya no estaban disponibles y el importe fue devuelto a tu medio de pago.";
    static final String ERROR_DATOS = "No pudimos procesar los datos de pago. Revisa la información e inténtalo de nuevo.";
    static final String ERROR_CREACION = "No pudimos iniciar el pago con Mercado Pago. No se realizó ningún cobro; inténtalo de nuevo.";
    static final String APROBADO = "¡Listo! Tu pago fue aprobado y tu compra quedó registrada.";
}
