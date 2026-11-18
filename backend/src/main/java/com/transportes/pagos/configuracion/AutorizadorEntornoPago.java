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

/** Decide qué entorno de pago puede usar cada usuario: real (PRODUCTION) o de prueba (SANDBOX). */
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

    /** Convierte el texto de la configuración en una lista de ids de usuario. */
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
                // se avisa más abajo
            }
            log.warn("MERCADOPAGO_SANDBOX_USUARIOS_AUTORIZADOS: se ignora el valor '{}' (debe ser un id_usuario numérico)",
                    valor.length() > 20 ? valor.substring(0, 20) : valor);
        }
        return ids;
    }

    /** true si el usuario está en la lista de autorizados para pagos de prueba. */
    public boolean puedeUsarSandbox(Integer idUsuario) {
        return idUsuario != null && usuariosSandbox.contains(idUsuario);
    }

    /** Decide con qué entorno se hará el pago. Lanza error si no es válido o el usuario no tiene permiso. */
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

    /** Entornos que la pantalla de pago puede ofrecer a este usuario, con su Public Key (que es pública). */
    public ConfiguracionPagoResponse configuracionPara(Integer idUsuario) {
        List<EntornoDisponible> entornos = new ArrayList<>();
        entornos.add(descripcion(EntornoPago.PRODUCTION));
        if (puedeUsarSandbox(idUsuario)) {
            entornos.add(descripcion(EntornoPago.SANDBOX));
        }
        // Por defecto siempre PRODUCTION: un comprador normal nunca debe caer en pruebas.
        return new ConfiguracionPagoResponse(entornos, EntornoPago.PRODUCTION.name());
    }

    private EntornoDisponible descripcion(EntornoPago entorno) {
        CredencialesMercadoPago.Par par = credenciales.de(entorno);
        return new EntornoDisponible(entorno.name(), credenciales.disponible(entorno),
                par.tienePublicKey() ? par.publicKey() : null);
    }
}
