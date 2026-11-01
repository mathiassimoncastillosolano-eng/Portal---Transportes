package com.transportes.pagos.mercadopago;

import java.util.EnumMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.pagos.configuracion.CredencialesMercadoPago;
import com.transportes.pagos.entidades.EntornoPago;

import tools.jackson.databind.ObjectMapper;

/**
 * Un cliente de la API de Orders por entorno. Cada cliente se construye UNA vez con el Access Token de su entorno,
 * de modo que es imposible, por construcción, consultar una order de Producción con credenciales de Sandbox (o al
 * revés): el llamador siempre elige el cliente con el entorno guardado en la operación.
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

    public ClienteMercadoPago de(EntornoPago entorno) {
        return clientes.get(entorno);
    }
}
