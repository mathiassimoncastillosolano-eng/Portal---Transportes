package com.transportes.auth.servicios;

import org.springframework.stereotype.Service;

/** Compone y envia los correos del flujo de recuperacion usando el {@link ClienteCorreo}. */
@Service
public class CorreoRecuperacionServicio {

    private final ClienteCorreo cliente;

    public CorreoRecuperacionServicio(ClienteCorreo cliente) {
        this.cliente = cliente;
    }

    /** Envia el codigo de verificacion. Lanza CorreoNoDisponibleException si Resend no confirma el envio. */
    public void enviarCodigo(String nombres, String correo, String codigo, int minutosValidez) {
        cliente.enviar(new MensajeCorreo(
                correo,
                PlantillasCorreoRecuperacion.ASUNTO_CODIGO,
                PlantillasCorreoRecuperacion.htmlCodigo(nombres, codigo, minutosValidez),
                PlantillasCorreoRecuperacion.textoCodigo(nombres, codigo, minutosValidez)));
    }

    /** Aviso para cuentas creadas con Google (sin contrasena propia): no lleva codigo. */
    public void enviarAvisoCuentaGoogle(String nombres, String correo) {
        cliente.enviar(new MensajeCorreo(
                correo,
                PlantillasCorreoRecuperacion.ASUNTO_CUENTA_GOOGLE,
                PlantillasCorreoRecuperacion.htmlCuentaGoogle(nombres),
                PlantillasCorreoRecuperacion.textoCuentaGoogle(nombres)));
    }
}
