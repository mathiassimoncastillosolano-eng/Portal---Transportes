package com.transportes.auth.servicios;

import com.transportes.auth.dto.IdentidadGoogle;
import com.transportes.auth.excepciones.GoogleServicioNoDisponibleException;
import com.transportes.auth.excepciones.GoogleTokenInvalidoException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.ProtectedHeader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Set;

/**
 * Valida el ID token (JWT) que Google entrega al frontend y extrae la
 * identidad del usuario.
 *
 * <p>Comprobaciones: firma RS256 con las claves publicas de Google
 * ({@link ClavesPublicasGoogle}), emisor de Google, audiencia igual al
 * Client ID de esta aplicacion, expiracion (con 60 s de tolerancia de reloj)
 * y correo verificado por Google. No se usa el Client Secret: el ID token se
 * verifica con criptografia de clave publica.</p>
 */
@Service
public class VerificadorTokenGoogle {

    private static final Set<String> EMISORES = Set.of("accounts.google.com", "https://accounts.google.com");
    private static final String MENSAJE_TOKEN_INVALIDO = "La credencial de Google no es valida o expiro.";

    private final ClavesPublicasGoogle claves;
    private final String clientId;

    public VerificadorTokenGoogle(ClavesPublicasGoogle claves,
                                  @Value("${google.client-id}") String clientId) {
        this.claves = claves;
        this.clientId = clientId;
    }

    public IdentidadGoogle verificar(String credencial) {
        Claims datos;
        try {
            datos = Jwts.parser()
                    .keyLocator(new LocatorAdapter<Key>() {
                        @Override
                        protected Key locate(ProtectedHeader cabecera) {
                            if (!"RS256".equals(cabecera.getAlgorithm())) {
                                throw new JwtException("Algoritmo no permitido");
                            }
                            return claves.obtener(cabecera.getKeyId())
                                    .orElseThrow(() -> new JwtException("Clave de firma desconocida"));
                        }
                    })
                    .clockSkewSeconds(60)
                    .build()
                    .parseSignedClaims(credencial)
                    .getPayload();
        } catch (GoogleServicioNoDisponibleException e) {
            throw e;
        } catch (JwtException | IllegalArgumentException e) {
            throw new GoogleTokenInvalidoException(MENSAJE_TOKEN_INVALIDO, e);
        } catch (RuntimeException e) {
            // JJWT puede envolver una excepcion lanzada por el localizador de claves.
            if (e.getCause() instanceof GoogleServicioNoDisponibleException causa) {
                throw causa;
            }
            throw new GoogleTokenInvalidoException(MENSAJE_TOKEN_INVALIDO, e);
        }

        if (datos.getIssuer() == null || !EMISORES.contains(datos.getIssuer())) {
            throw new GoogleTokenInvalidoException(MENSAJE_TOKEN_INVALIDO);
        }
        if (datos.getAudience() == null || !datos.getAudience().contains(clientId)) {
            throw new GoogleTokenInvalidoException(MENSAJE_TOKEN_INVALIDO);
        }

        String googleId = datos.getSubject();
        String correo = datos.get("email", String.class);
        if (googleId == null || googleId.isBlank() || correo == null || correo.isBlank()) {
            throw new GoogleTokenInvalidoException("Google no proporciono el correo de la cuenta.");
        }
        if (!esVerdadero(datos.get("email_verified"))) {
            throw new GoogleTokenInvalidoException("El correo de la cuenta de Google no esta verificado.");
        }

        return new IdentidadGoogle(
                googleId,
                correo.trim().toLowerCase(java.util.Locale.ROOT),
                datos.get("given_name", String.class),
                datos.get("family_name", String.class),
                datos.get("name", String.class));
    }

    /** Google envia email_verified como booleano; se tolera tambien la cadena "true". */
    private static boolean esVerdadero(Object valor) {
        return Boolean.TRUE.equals(valor) || "true".equalsIgnoreCase(String.valueOf(valor));
    }
}
