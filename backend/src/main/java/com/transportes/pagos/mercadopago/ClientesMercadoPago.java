package com.transportes.pagos.mercadopago;

import java.util.EnumMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.pagos.configuracion.CredencialesMercadoPago;
import com.transportes.pagos.entidades.EntornoPago;

import tools.jackson.databind.ObjectMapper;

/**
 * Guarda un cliente HTTP por entorno, cada uno creado con su propio Access Token. Así es imposible consultar una
 * order de Producción con credenciales de Sandbox: se elige el cliente según el entorno guardado en la operación.
 */
@Component
public class ClientesMercadoPago {

    private final Map<EntornoPago, ClienteMercadoPago> clientes = new EnumMap<>(EntornoPago.class);

    public ClientesMercadoPago(CredencialesMercadoPago credenciales,
            @Value("${mercadopago.url-api:https://api.mercadopago.com}") String urlBase,
            @Value("${mercadopago.timeout-segundos:20}") long timeoutSegundos,
            ObjectMapper json) {
        for (EntornoPago entorno : EntornoPago.values()) {
            clientes.put(entorno, new ClienteMercadoPagoHttp(credenciales.de(entorno).accessToken(), urlBase,
                    timeoutSegundos, json));
        }
    }

    /** Cliente HTTP del entorno pedido. */
    public ClienteMercadoPago de(EntornoPago entorno) {
        return clientes.get(entorno);
    }
}
