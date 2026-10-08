package com.transportes.auth.servicios;

/**
 * Plantillas (HTML con estilos en linea + texto plano) de los correos de recuperacion.
 * Paleta tomada del tema oscuro de RutaLibre: fondo azul oscuro, acento verde turquesa.
 */
final class PlantillasCorreoRecuperacion {

    static final String ASUNTO_CODIGO = "Código de recuperación de contraseña - RutaLibre";
    static final String ASUNTO_CUENTA_GOOGLE = "Tu cuenta de RutaLibre usa Google para iniciar sesión";

    private static final String FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    private PlantillasCorreoRecuperacion() {
    }

    static String htmlCodigo(String nombres, String codigo, int minutos) {
        String contenido = ""
                + parrafo(saludo(nombres, true))
                + parrafo("Recibimos una solicitud para recuperar el acceso a tu cuenta de RutaLibre. "
                + "Usa este código de verificación para continuar:")
                + "<div style=\"margin:24px 0;padding:18px 12px;text-align:center;background:#08141A;"
                + "border:1px solid #3CCDA3;border-radius:14px;\">"
                + "<span style=\"font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;"
                + "letter-spacing:10px;color:#5FD7AE;padding-left:10px;\">" + escaparHtml(codigo) + "</span></div>"
                + parrafo("El código es válido durante <strong style=\"color:#E6F1F4;\">" + minutos
                + " minutos</strong> y solo puede usarse una vez.")
                + "<p style=\"margin:0 0 16px;padding:12px 14px;border-radius:10px;background:rgba(242,112,110,0.10);"
                + "border:1px solid rgba(242,112,110,0.30);font-size:13px;line-height:1.55;color:#F4B4B3;\">"
                + "No compartas este código con nadie. El equipo de RutaLibre nunca te lo pedirá.</p>"
                + parrafo("Si no solicitaste este cambio, ignora este mensaje: tu contraseña no se modificará.");
        return envolver("Tu código de verificación es " + codigo, contenido);
    }

    static String textoCodigo(String nombres, String codigo, int minutos) {
        return saludo(nombres, false) + "\n\n"
                + "Recibimos una solicitud para recuperar el acceso a tu cuenta de RutaLibre.\n\n"
                + "Tu código de verificación es: " + codigo + "\n\n"
                + "Es válido durante " + minutos + " minutos y solo puede usarse una vez.\n"
                + "No compartas este código con nadie. El equipo de RutaLibre nunca te lo pedirá.\n\n"
                + "Si no solicitaste este cambio, ignora este mensaje: tu contraseña no se modificará.\n\n"
                + "— RutaLibre";
    }

    static String htmlCuentaGoogle(String nombres) {
        String contenido = ""
                + parrafo(saludo(nombres, true))
                + parrafo("Alguien pidió recuperar la contraseña de esta cuenta de RutaLibre, pero tu cuenta "
                + "se creó con Google y no tiene una contraseña propia.")
                + parrafo("Para entrar, usa el botón <strong style=\"color:#E6F1F4;\">Continuar con Google</strong> "
                + "en la pantalla de inicio de sesión. No necesitas hacer nada más.")
                + parrafo("Si no fuiste tú, puedes ignorar este mensaje.");
        return envolver("Tu cuenta usa Google para iniciar sesión", contenido);
    }

    static String textoCuentaGoogle(String nombres) {
        return saludo(nombres, false) + "\n\n"
                + "Alguien pidió recuperar la contraseña de esta cuenta de RutaLibre, pero tu cuenta se creó con "
                + "Google y no tiene una contraseña propia.\n\n"
                + "Para entrar, usa el botón \"Continuar con Google\" en la pantalla de inicio de sesión.\n\n"
                + "Si no fuiste tú, puedes ignorar este mensaje.\n\n"
                + "— RutaLibre";
    }

    private static String saludo(String nombres, boolean html) {
        String limpio = nombres == null ? "" : nombres.strip();
        if (limpio.isEmpty() || limpio.equals("-")) {
            return "Hola,";
        }
        return "Hola, " + (html ? escaparHtml(limpio) : limpio) + ".";
    }

    private static String parrafo(String contenido) {
        return "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;color:#B7C9CF;\">" + contenido + "</p>";
    }

    private static String envolver(String preencabezado, String contenido) {
        return "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<meta name=\"color-scheme\" content=\"dark\"></head>"
                + "<body style=\"margin:0;padding:0;background:#071318;\">"
                + "<span style=\"display:none;max-height:0;overflow:hidden;opacity:0;\">" + escaparHtml(preencabezado) + "</span>"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#071318;\">"
                + "<tr><td align=\"center\" style=\"padding:32px 16px;\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"max-width:480px;background:#0E1C22;border:1px solid #1F3640;border-radius:22px;\">"
                + "<tr><td style=\"padding:32px 28px 28px;font-family:" + FUENTE + ";\">"
                + "<div style=\"margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#E6F1F4;\">"
                + "Ruta<span style=\"color:#3CCDA3;\">Libre</span></div>"
                + contenido
                + "<hr style=\"border:none;border-top:1px solid #1F3640;margin:24px 0 16px;\">"
                + "<p style=\"margin:0;font-size:12px;line-height:1.5;color:#82979F;\">"
                + "Este mensaje se envió automáticamente. Por favor, no respondas a este correo.</p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }

    static String escaparHtml(String texto) {
        StringBuilder sb = new StringBuilder(texto.length() + 8);
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
