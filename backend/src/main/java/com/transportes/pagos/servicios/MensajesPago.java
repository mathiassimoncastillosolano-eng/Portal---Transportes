package com.transportes.pagos.servicios;

import java.util.Map;

final class MensajesPago {

    private static final String GENERICO = "El pago no fue aprobado. Puedes intentarlo de nuevo con otro medio de pago.";

    private static final Map<String, String> POR_MOTIVO = Map.ofEntries(
            Map.entry("insufficient_funds", "El medio de pago no tiene fondos suficientes."),
            Map.entry("incorrect_cvv", "El código de seguridad de la tarjeta no es correcto."),
            Map.entry("invalid_cvv", "El código de seguridad de la tarjeta no es correcto."),
            Map.entry("too_many_attempts_cvv", "Se superó el límite de intentos del código de seguridad. Usa otra tarjeta."),
            Map.entry("expired_card", "La tarjeta está vencida."),
            Map.entry("invalid_card", "Revisa los datos de la tarjeta e inténtalo de nuevo."),
            Map.entry("incorrect_number", "Revisa el número de la tarjeta."),
            Map.entry("contact_issuer", "Debes comunicarte con tu banco para autorizar este pago antes de reintentar."),
            Map.entry("stolen_card", "El pago fue rechazado por seguridad. Usa otro medio de pago."),
            Map.entry("lost_card", "El pago fue rechazado por seguridad. Usa otro medio de pago."),
            Map.entry("fraudulent", "El pago fue rechazado por seguridad. Usa otro medio de pago."),
            Map.entry("blocked_card", "La tarjeta está bloqueada. Comunícate con tu banco."),
            Map.entry("restricted_card", "La tarjeta tiene restricciones. Comunícate con tu banco."),
            Map.entry("issuer_not_available_retry", "Tu banco no respondió. Inténtalo de nuevo en unos minutos."),
            Map.entry("issuer_decline_operation", "Tu banco rechazó la operación. Intenta con otra tarjeta."),
            Map.entry("processing_error", "Ocurrió un error al procesar el pago. Inténtalo de nuevo."),
            Map.entry("generic_decline", "Tu banco rechazó el pago. Intenta con otra tarjeta u otro medio."),
            Map.entry("card_declined", "Tu banco rechazó el pago. Intenta con otra tarjeta u otro medio."));

    private MensajesPago() {
    }

    static String rechazo(String motivo, String mensajeProveedor) {
        String conocido = motivo == null ? null : POR_MOTIVO.get(motivo);
        if (conocido != null) {
            return conocido;
        }
        if (mensajeProveedor != null && !mensajeProveedor.isBlank() && mensajeProveedor.length() <= 200) {
            return mensajeProveedor.strip();
        }
        return GENERICO;
    }

    static final String EN_PROCESO =
            "Tu pago está en revisión. Te mostraremos el resultado apenas Culqi lo confirme.";
    static final String VERIFICANDO =
            "Estamos verificando tu pago con Culqi. No vuelvas a pagar mientras tanto.";
    static final String AUTENTICACION_3DS = "Tu banco solicita una autenticación adicional (3D Secure) para completar el pago.";
    static final String EXPIRADO = "El tiempo para completar el pago terminó y la operación se canceló.";
    static final String SIN_ASIENTOS = "Recibimos tu pago, pero tus asientos ya no estaban disponibles. "
            + "Estamos devolviendo el importe a tu medio de pago.";
    static final String REEMBOLSADO = "Tus asientos ya no estaban disponibles y el importe fue devuelto a tu medio de pago.";
    static final String ERROR_DATOS = "No pudimos procesar los datos de pago. Revisa la información e inténtalo de nuevo.";
    static final String ERROR_CREACION = "No pudimos iniciar el pago con Culqi. No se realizó ningún cobro; inténtalo de nuevo.";
    static final String APROBADO = "¡Listo! Tu pago fue aprobado y tu compra quedó registrada.";
}
