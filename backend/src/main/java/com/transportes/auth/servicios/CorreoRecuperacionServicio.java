package com.transportes.auth.servicios;

import org.springframework.stereotype.Service;

/** Arma y envía los correos de la recuperación de contraseña. */
@Service
public class CorreoRecuperacionServicio {

    private final ClienteCorreo cliente;

    public CorreoRecuperacionServicio(ClienteCorreo cliente) {
        this.cliente = cliente;
    }

    /** Envía el código de verificación. Si Resend no confirma el envío lanza CorreoNoDisponibleException. */
    public void enviarCodigo(String nombres, String correo, String codigo, int minutosValidez) {
        cliente.enviar(new MensajeCorreo(
                correo,
                PlantillasCorreoRecuperacion.ASUNTO_CODIGO,
                PlantillasCorreoRecuperacion.htmlCodigo(nombres, codigo, minutosValidez),
                PlantillasCorreoRecuperacion.textoCodigo(nombres, codigo, minutosValidez)));
    }

    /** Para cuentas creadas con Google (sin contraseña): avisa que entren con Google. No lleva código. */
    public void enviarAvisoCuentaGoogle(String nombres, String correo) {
        cliente.enviar(new MensajeCorreo(
                correo,
                PlantillasCorreoRecuperacion.ASUNTO_CUENTA_GOOGLE,
                PlantillasCorreoRecuperacion.htmlCuentaGoogle(nombres),
                PlantillasCorreoRecuperacion.textoCuentaGoogle(nombres)));
    }
}
