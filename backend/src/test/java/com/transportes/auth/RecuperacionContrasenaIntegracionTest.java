package com.transportes.auth;

import com.transportes.auth.dto.IdentidadGoogle;
import com.transportes.auth.excepciones.CorreoNoDisponibleException;
import com.transportes.auth.servicios.ClienteCorreo;
import com.transportes.auth.servicios.MensajeCorreo;
import com.transportes.auth.servicios.VerificadorTokenGoogle;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Flujo completo de recuperacion de contrasena contra la API real (H2 en modo PostgreSQL).
 * Solo se sustituyen los puntos externos: el envio de correo (Resend) y la verificacion del ID token de Google.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class RecuperacionContrasenaIntegracionTest {

    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean ClienteCorreo clienteCorreo;
    @MockitoBean VerificadorTokenGoogle verificador;

    final HttpClient http = HttpClient.newHttpClient();
    static final String CLAVE_VIEJA = "ClaveVieja2026!";
    static final String CLAVE_NUEVA = "ClaveNueva2026!";
    static final String RUTA = "/api/auth/password-reset";

    // ---------------------------------------------------------------- utilidades

    String correoNuevo() { return "rec-" + UUID.randomUUID() + "@example.com"; }

    HttpResponse<String> post(String ruta, Object cuerpo) throws Exception {
        var solicitud = HttpRequest.newBuilder(URI.create("http://localhost:" + port + ruta))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo))).build();
        return http.send(solicitud, HttpResponse.BodyHandlers.ofString());
    }

    void registrar(String correo) throws Exception {
        var r = post("/api/usuarios/registro",
                Map.of("nombres", "Lucas", "apellidos", "Prueba", "correo", correo, "contrasena", CLAVE_VIEJA));
        assertEquals(201, r.statusCode(), r.body());
    }

    HttpResponse<String> login(String correo, String clave) throws Exception {
        return post("/api/auth/login", Map.of("correo", correo, "contrasena", clave));
    }

    HttpResponse<String> solicitar(String correo) throws Exception {
        return post(RUTA + "/request", Map.of("correo", correo));
    }

    HttpResponse<String> verificar(String correo, String codigo) throws Exception {
        return post(RUTA + "/verify", Map.of("correo", correo, "codigo", codigo));
    }

    HttpResponse<String> completar(String prueba, String clave) throws Exception {
        return post(RUTA + "/complete",
                Map.of("pruebaRecuperacion", prueba, "contrasena", clave, "confirmarContrasena", clave));
    }

    /** Ultimo mensaje entregado al cliente de correo (doble de prueba). */
    MensajeCorreo ultimoCorreo() {
        ArgumentCaptor<MensajeCorreo> captor = ArgumentCaptor.forClass(MensajeCorreo.class);
        verify(clienteCorreo, atLeastOnce()).enviar(captor.capture());
        List<MensajeCorreo> todos = captor.getAllValues();
        return todos.get(todos.size() - 1);
    }

    String ultimoCodigo() {
        Matcher m = Pattern.compile("es: (\\d{6})").matcher(ultimoCorreo().texto());
        assertTrue(m.find(), "el correo debe incluir un codigo de 6 digitos");
        return m.group(1);
    }

    String otroCodigo(String codigo) { return "000000".equals(codigo) ? "111111" : "000000"; }

    String prueba(HttpResponse<String> respuesta) throws Exception {
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        return json.readTree(respuesta.body()).get("pruebaRecuperacion").asText();
    }

    int filas(String correo) {
        return jdbc.queryForObject("select count(*) from password_reset_tokens t join usuario u "
                + "on u.id_usuario = t.id_usuario where u.correo = ?", Integer.class, correo);
    }

    // ---------------------------------------------------------------- pruebas

    @Test void flujoCompletoCambiaLaContrasenaYElCodigoNuncaSeGuardaEnClaro() throws Exception {
        String correo = correoNuevo();
        registrar(correo);

        var solicitud = solicitar(correo);
        assertEquals(200, solicitud.statusCode(), solicitud.body());
        String codigo = ultimoCodigo();
        assertEquals(correo, ultimoCorreo().para());

        String hash = jdbc.queryForObject("select t.token_hash from password_reset_tokens t join usuario u "
                + "on u.id_usuario = t.id_usuario where u.correo = ?", String.class, correo);
        assertEquals(64, hash.length());
        assertNotEquals(codigo, hash);

        String prueba = prueba(verificar(correo, codigo));
        var cambio = completar(prueba, CLAVE_NUEVA);
        assertEquals(200, cambio.statusCode(), cambio.body());

        assertEquals(200, login(correo, CLAVE_NUEVA).statusCode());
        assertEquals(401, login(correo, CLAVE_VIEJA).statusCode());

        // El desafio queda usado y no se puede reutilizar ni el codigo ni la prueba.
        assertEquals(0, jdbc.queryForObject("select count(*) from password_reset_tokens t join usuario u "
                + "on u.id_usuario = t.id_usuario where u.correo = ? and t.fecha_uso is null", Integer.class, correo));
        assertEquals(400, verificar(correo, codigo).statusCode());
        assertEquals(410, completar(prueba, "OtraClave2026!!").statusCode());
        assertEquals(200, login(correo, CLAVE_NUEVA).statusCode());
    }

    @Test void unCodigoIncorrectoSeRechazaYTrasLosIntentosMaximosElDesafioSeBloquea() throws Exception {
        String correo = correoNuevo();
        registrar(correo);
        solicitar(correo);
        String bueno = ultimoCodigo();
        String malo = otroCodigo(bueno);

        for (int i = 0; i < 4; i++) {
            assertEquals(400, verificar(correo, malo).statusCode());
        }
        assertEquals(429, verificar(correo, malo).statusCode());
        // Bloqueado: ni siquiera el codigo correcto sirve; hay que pedir uno nuevo.
        assertEquals(429, verificar(correo, bueno).statusCode());

        solicitar(correo);
        assertEquals(200, verificar(correo, ultimoCodigo()).statusCode());
    }

    @Test void unCodigoExpiradoSeRechaza() throws Exception {
        String correo = correoNuevo();
        registrar(correo);
        solicitar(correo);
        String codigo = ultimoCodigo();
        jdbc.update("update password_reset_tokens set fecha_expiracion = dateadd('MINUTE', -1, current_timestamp) "
                + "where id_usuario = (select id_usuario from usuario where correo = ?)", correo);
        assertEquals(400, verificar(correo, codigo).statusCode());
    }

    @Test void pedirUnCodigoNuevoInvalidaElAnterior() throws Exception {
        String correo = correoNuevo();
        registrar(correo);
        solicitar(correo);
        String primero = ultimoCodigo();
        solicitar(correo);
        String segundo = ultimoCodigo();
        if (!primero.equals(segundo)) {
            assertEquals(400, verificar(correo, primero).statusCode());
        }
        assertEquals(200, verificar(correo, segundo).statusCode());
    }

    @Test void solicitarParaUnCorreoInexistenteDaLaMismaRespuestaYNoEnviaNada() throws Exception {
        String existente = correoNuevo();
        registrar(existente);
        var real = solicitar(existente);
        var falsa = solicitar(correoNuevo());

        assertEquals(200, falsa.statusCode());
        assertEquals(real.statusCode(), falsa.statusCode());
        assertEquals(json.readTree(real.body()).get("mensaje").asText(), json.readTree(falsa.body()).get("mensaje").asText());
        // Solo se envio el correo de la cuenta real.
        verify(clienteCorreo, atLeastOnce()).enviar(any(MensajeCorreo.class));
        assertEquals(existente, ultimoCorreo().para());
    }

    @Test void unaCuentaDeGoogleSinContrasenaRecibeUnAvisoSinCodigoYNoSeCreaDesafio() throws Exception {
        String correo = correoNuevo();
        when(verificador.verificar("cred-g")).thenReturn(new IdentidadGoogle("g-" + correo, correo, "Ana", "Pérez", "Ana Pérez"));
        assertEquals(200, post("/api/auth/google", Map.of("credential", "cred-g")).statusCode());

        var respuesta = solicitar(correo);
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        assertEquals(0, filas(correo));
        var aviso = ultimoCorreo();
        assertEquals(correo, aviso.para());
        assertFalse(Pattern.compile("\\b\\d{6}\\b").matcher(aviso.texto()).find());
        assertEquals(200, post("/api/auth/google", Map.of("credential", "cred-g")).statusCode());
    }

    @Test void unaCuentaInactivaNoRecibeCodigo() throws Exception {
        String correo = correoNuevo();
        registrar(correo);
        jdbc.update("update usuario set activo = false where correo = ?", correo);

        assertEquals(200, solicitar(correo).statusCode());
        verify(clienteCorreo, never()).enviar(any(MensajeCorreo.class));
        assertEquals(0, filas(correo));
    }

    @Test void siResendFallaSeResponde503YElCodigoQuedaInvalidado() throws Exception {
        String correo = correoNuevo();
        registrar(correo);
        doThrow(new CorreoNoDisponibleException()).when(clienteCorreo).enviar(any(MensajeCorreo.class));

        var respuesta = solicitar(correo);
        assertEquals(503, respuesta.statusCode(), respuesta.body());
        assertEquals(0, jdbc.queryForObject("select count(*) from password_reset_tokens t join usuario u "
                + "on u.id_usuario = t.id_usuario where u.correo = ? and t.fecha_uso is null", Integer.class, correo));
    }

    @Test void dosCambiosSimultaneosConLaMismaPruebaSoloTienenUnGanador() throws Exception {
        String correo = correoNuevo();
        registrar(correo);
        solicitar(correo);
        String prueba = prueba(verificar(correo, ultimoCodigo()));

        var pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> a = () -> completar(prueba, "ClaveGanadoraA2026!").statusCode();
            Callable<Integer> b = () -> completar(prueba, "ClaveGanadoraB2026!").statusCode();
            var fa = pool.submit(a);
            var fb = pool.submit(b);
            List<Integer> estados = List.of(fa.get(), fb.get());
            assertEquals(1, estados.stream().filter(e -> e == 200).count(), estados.toString());
            assertEquals(1, estados.stream().filter(e -> e == 410).count(), estados.toString());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test void laPoliticaDeContrasenaSeValidaEnElBackend() throws Exception {
        String correo = correoNuevo();
        registrar(correo);
        solicitar(correo);
        String prueba = prueba(verificar(correo, ultimoCodigo()));

        assertEquals(400, completar(prueba, "corta").statusCode());
        assertEquals(400, completar(prueba, "a".repeat(73)).statusCode());
        var distintas = post(RUTA + "/complete", Map.of("pruebaRecuperacion", prueba,
                "contrasena", CLAVE_NUEVA, "confirmarContrasena", "OtraClave2026!"));
        assertEquals(400, distintas.statusCode());
        // Los rechazos no gastaron la prueba: con una contrasena valida sigue funcionando.
        assertEquals(200, completar(prueba, CLAVE_NUEVA).statusCode());
    }

    @Test void unaPruebaFalsaOAjenaSeRechazaSinElegirCuenta() throws Exception {
        assertEquals(410, completar("prueba.falsa", CLAVE_NUEVA).statusCode());
        assertEquals(400, post(RUTA + "/complete", Map.of("contrasena", CLAVE_NUEVA)).statusCode());
    }

    @Test void elCambioNoAfectaAOtrasCuentasNiRompeElAccesoConGoogle() throws Exception {
        String correo = correoNuevo();
        String otro = correoNuevo();
        registrar(correo);
        registrar(otro);
        // La cuenta tiene contrasena y tambien Google vinculado.
        jdbc.update("update usuario set google_id = ? where correo = ?", "g-" + correo, correo);
        when(verificador.verificar("cred-vinculada")).thenReturn(new IdentidadGoogle("g-" + correo, correo, "Lucas", "Prueba", "Lucas Prueba"));

        solicitar(correo);
        String prueba = prueba(verificar(correo, ultimoCodigo()));
        assertEquals(200, completar(prueba, CLAVE_NUEVA).statusCode());

        assertEquals("g-" + correo, jdbc.queryForObject("select google_id from usuario where correo = ?", String.class, correo));
        assertEquals(200, post("/api/auth/google", Map.of("credential", "cred-vinculada")).statusCode());
        assertEquals(200, login(otro, CLAVE_VIEJA).statusCode());
    }
}
