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

/** Revisa que el token de Google sea válido y saca de él los datos del usuario. */
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

    /** Devuelve la identidad si todo es correcto; si algo falla lanza GoogleTokenInvalidoException. */
    public IdentidadGoogle verificar(String credencial) {
        Claims datos;
        try {
            datos = Jwts.parser()
                    .keyLocator(new LocatorAdapter<Key>() {
                        /** Elige la clave pública de Google según el "kid" de la cabecera del token. */
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
            // La librería JJWT puede envolver el error de "Google no responde"; se saca para responder 503 y no
            // 401.
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

    /** email_verified puede venir como booleano o como el texto "true". */
    private static boolean esVerdadero(Object valor) {
        return Boolean.TRUE.equals(valor) || "true".equalsIgnoreCase(String.valueOf(valor));
    }
}
