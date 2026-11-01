package com.transportes.pagos.configuracion;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.transportes.pagos.dto.ConfiguracionPagoResponse;
import com.transportes.pagos.dto.ConfiguracionPagoResponse.EntornoDisponible;
import com.transportes.pagos.entidades.EntornoPago;
import com.transportes.pagos.excepciones.PagoException;

/**
 * Decide, EN EL BACKEND, qué entorno de pago puede usar cada usuario.
 *
 * <ul>
 *   <li>PRODUCTION: cualquier usuario autenticado (cuando las credenciales productivas están configuradas).</li>
 *   <li>SANDBOX: solo los usuarios cuyo {@code id_usuario} figura en {@code MERCADOPAGO_SANDBOX_USUARIOS_AUTORIZADOS}.
 *       Con la variable vacía, nadie puede usar Sandbox.</li>
 * </ul>
 *
 * <p>La autorización es por {@code id_usuario} (identificador interno que el usuario no puede elegir) y no por
 * correo: el registro de RutaLibre no exige verificar el correo, y una lista de correos permitiría que otra persona
 * se registre antes con ese correo y obtenga acceso a Sandbox.</p>
 *
 * <p>Lo que envía el navegador ({@code entorno}) es solo una solicitud; esta clase la valida siempre.</p>
 */
@Component
public class AutorizadorEntornoPago {

    private static final Logger log = LoggerFactory.getLogger(AutorizadorEntornoPago.class);

    private final Set<Integer> usuariosSandbox;
    private final CredencialesMercadoPago credenciales;

    public AutorizadorEntornoPago(
            @Value("${mercadopago.sandbox.usuarios-autorizados:}") String usuariosAutorizados,
            CredencialesMercadoPago credenciales) {
        this.usuariosSandbox = Collections.unmodifiableSet(analizarUsuarios(usuariosAutorizados));
        this.credenciales = credenciales;
    }

    /** "12, 15,abc,,12" -> {12, 15}. Los valores que no son enteros positivos se ignoran (con aviso en el log). */
    static Set<Integer> analizarUsuarios(String texto) {
        Set<Integer> ids = new TreeSet<>();
        if (texto == null) {
            return ids;
        }
        for (String parte : texto.split(",")) {
            String valor = parte.strip();
            if (valor.isEmpty()) {
                continue;
            }
            try {
                int id = Integer.parseInt(valor);
                if (id > 0) {
                    ids.add(id);
                    continue;
                }
            } catch (NumberFormatException e) {
                // se informa abajo
            }
            log.warn("MERCADOPAGO_SANDBOX_USUARIOS_AUTORIZADOS: se ignora el valor '{}' (debe ser un id_usuario numérico)",
                    valor.length() > 20 ? valor.substring(0, 20) : valor);
        }
        return ids;
    }

    public boolean puedeUsarSandbox(Integer idUsuario) {
        return idUsuario != null && usuariosSandbox.contains(idUsuario);
    }

    /**
     * Entorno con el que se procesará el pago.
     *
     * @param solicitado texto enviado por el navegador (puede faltar: se asume PRODUCTION, el entorno seguro)
     * @throws PagoException 400 si el valor no es válido; 403 si pide Sandbox sin autorización; 503 si el entorno
     *                       no tiene credenciales configuradas en el servidor
     */
    public EntornoPago resolver(String solicitado, Integer idUsuario) {
        EntornoPago entorno = solicitado == null || solicitado.isBlank()
                ? EntornoPago.PRODUCTION : EntornoPago.desde(solicitado);
        if (entorno == null) {
            throw new PagoException(HttpStatus.BAD_REQUEST, "El entorno de pago no es válido.");
        }
        if (entorno == EntornoPago.SANDBOX && !puedeUsarSandbox(idUsuario)) {
            log.warn("Intento de usar Sandbox sin autorización (id_usuario={})", idUsuario);
            throw new PagoException(HttpStatus.FORBIDDEN, "No tienes autorización para usar el entorno de pruebas.");
        }
        if (!credenciales.disponible(entorno)) {
            log.error("Pago rechazado: el entorno {} no tiene credenciales configuradas en el backend", entorno);
            throw new PagoException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Los pagos no están disponibles en este momento. Inténtalo más tarde.");
        }
        return entorno;
    }

    /** Entornos que la interfaz puede ofrecer a este usuario (con sus Public Keys, que son públicas). */
    public ConfiguracionPagoResponse configuracionPara(Integer idUsuario) {
        List<EntornoDisponible> entornos = new ArrayList<>();
        entornos.add(descripcion(EntornoPago.PRODUCTION));
        if (puedeUsarSandbox(idUsuario)) {
            entornos.add(descripcion(EntornoPago.SANDBOX));
        }
        // PRODUCTION es el valor por defecto aunque aún no esté configurado: el usuario normal no debe caer en pruebas.
        return new ConfiguracionPagoResponse(entornos, EntornoPago.PRODUCTION.name());
    }

    private EntornoDisponible descripcion(EntornoPago entorno) {
        CredencialesMercadoPago.Par par = credenciales.de(entorno);
        return new EntornoDisponible(entorno.name(), credenciales.disponible(entorno),
                par.tienePublicKey() ? par.publicKey() : null);
    }
}
