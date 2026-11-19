package com.transportes.pagos.configuracion;

import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.transportes.pagos.entidades.EntornoPago;

@Component
public class CredencialesCulqi {

    private static final Logger log = LoggerFactory.getLogger(CredencialesCulqi.class);
    private static final Pattern LLAVE_PUBLICA = Pattern.compile("^pk_(test|live)_[A-Za-z0-9]+$");
    private static final Pattern LLAVE_SECRETA = Pattern.compile("^sk_(test|live)_[A-Za-z0-9]+$");

    private final String llavePublica;
    private final String llaveSecreta;
    private final EntornoPago entorno;
    private final boolean validas;

    public CredencialesCulqi(
            @Value("${culqi.public-key:}") String llavePublica,
            @Value("${culqi.secret-key:}") String llaveSecreta) {
        this.llavePublica = limpio(llavePublica);
        this.llaveSecreta = limpio(llaveSecreta);
        boolean formato = LLAVE_PUBLICA.matcher(this.llavePublica).matches()
                && LLAVE_SECRETA.matcher(this.llaveSecreta).matches();
        boolean mismoEntorno = formato && esPrueba(this.llavePublica) == esPrueba(this.llaveSecreta);
        if (!this.llavePublica.isEmpty() || !this.llaveSecreta.isEmpty()) {
            if (!formato) {
                log.error("Las llaves de Culqi no tienen el formato esperado (pk_test_/pk_live_ y sk_test_/sk_live_): "
                        + "los pagos quedan deshabilitados");
            } else if (!mismoEntorno) {
                log.error("Las llaves de Culqi son de entornos distintos (prueba y producción): "
                        + "los pagos quedan deshabilitados");
            }
        }
        this.validas = mismoEntorno;
        this.entorno = validas && !esPrueba(this.llavePublica) ? EntornoPago.PRODUCTION : EntornoPago.SANDBOX;
    }

    public boolean disponible() {
        return validas;
    }

    public String llavePublica() {
        return llavePublica;
    }

    public String llaveSecreta() {
        return llaveSecreta;
    }

    public EntornoPago entorno() {
        return entorno;
    }

    private static boolean esPrueba(String llave) {
        return llave.contains("_test_");
    }

    private static String limpio(String valor) {
        return valor == null ? "" : valor.strip();
    }

    @Override
    public String toString() {
        return "CredencialesCulqi[entorno=" + entorno + ", disponible=" + validas + "]";
    }
}
