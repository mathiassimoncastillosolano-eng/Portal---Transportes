package com.transportes.postergacion.servicios;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.pagos.entidades.AuditoriaPago;
import com.transportes.pagos.entidades.MetodoPago;
import com.transportes.pagos.repositorios.AuditoriaPagoRepositorio;
import com.transportes.pagos.repositorios.MetodoPagoRepositorio;
import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.dto.IntentoPagoCambioDto;
import com.transportes.postergacion.dto.RegistrarPagoCambioRequest;
import com.transportes.postergacion.dto.ResultadoPagoCambioDto;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.reglas.MetodoPagoAgencia;
import com.transportes.postergacion.servicios.CambioViajeAgenciaServicio.CambioPreparado;

/**
 * Pago de la diferencia cuando el viaje nuevo es más caro (cambio de viajes desde el Sistema Empresarial).
 * Cada intento queda en auditoria_pago. Si se aprueba, el cambio se aplica en la misma transacción;
 * si se rechaza, el pasaje no cambia y el agente puede intentar otra vez.
 */
@Service
public class PagoDiferenciaCambioServicio {

    public static final String SIN_DIFERENCIA = "SIN_DIFERENCIA";
    public static final String METODO_NO_HABILITADO = "METODO_NO_HABILITADO";
    public static final String FALTA_RESULTADO = "FALTA_RESULTADO";
    public static final String FALTA_CODIGO_POS = "FALTA_CODIGO_POS";

    private final CambioViajeAgenciaServicio cambios;
    private final AplicacionCambioViaje aplicacion;
    private final AuditoriaPagoRepositorio auditoria;
    private final MetodoPagoRepositorio metodos;
    private final Clock reloj;

    public PagoDiferenciaCambioServicio(CambioViajeAgenciaServicio cambios, AplicacionCambioViaje aplicacion,
                                        AuditoriaPagoRepositorio auditoria, MetodoPagoRepositorio metodos,
                                        Clock relojNegocio) {
        this.cambios = cambios;
        this.aplicacion = aplicacion;
        this.auditoria = auditoria;
        this.metodos = metodos;
        this.reloj = relojNegocio;
    }

    @Transactional
    public ResultadoPagoCambioDto registrarPago(int idUsuarioAgente, int idPasaje, RegistrarPagoCambioRequest solicitud) {
        cambios.bloquearPasaje(idPasaje);

        // Doble clic o reenvío: se responde lo que ya se registró, sin cobrar otra vez.
        Optional<AuditoriaPago> repetido = auditoria.findByClaveIdempotencia(solicitud.claveIdempotencia());
        if (repetido.isPresent()) {
            return respuestaDe(repetido.get());
        }

        CambioPreparado cambio = cambios.prepararCambio(idUsuarioAgente, idPasaje, solicitud.idViajeNuevo(),
                solicitud.idAsiento(), solicitud.tokenSesion());
        if (!cambio.tarifa().requierePago()) {
            throw new PostergacionRechazadaException(SIN_DIFERENCIA,
                    "Este cambio no tiene diferencia por pagar. Confírmelo sin registrar un pago.");
        }

        MetodoPagoAgencia metodo = MetodoPagoAgencia.valueOf(solicitud.metodo());
        String resultado = resultadoDelPago(metodo, solicitud.resultado());
        String codigoPos = codigoDelPos(metodo, resultado, solicitud.numeroOperacion());
        BigDecimal monto = cambio.tarifa().montoAPagar(); // lo calcula el servidor, nunca el navegador

        AuditoriaPago intento = new AuditoriaPago();
        intento.setIdVenta(cambio.pasaje().idVenta());
        intento.setConcepto(AuditoriaPago.CONCEPTO_CAMBIO_VIAJE);
        intento.setIdPasaje(idPasaje);
        intento.setIdMetodoPago(idMetodoEnCatalogo(metodo));
        intento.setMonto(monto);
        intento.setResultado(resultado);
        intento.setNumeroOperacion(codigoPos);
        intento.setClaveIdempotencia(solicitud.claveIdempotencia());
        intento.setIdEmpleado(cambio.idEmpleado());
        intento.setFechaIntento(LocalDateTime.now(reloj));

        if (!intento.estaAprobado()) {
            auditoria.save(intento);
            return new ResultadoPagoCambioDto(false, resultado, metodo.name(), monto,
                    "El pago con " + metodo.nombreEnCatalogo() + " fue rechazado. El pasaje no cambió. "
                    + "Puede intentar de nuevo, con el mismo u otro método, mientras el asiento siga reservado.",
                    null);
        }

        // Aprobado: se aplica el cambio y el intento queda enlazado a ese cambio. Todo o nada.
        ConfirmacionPostergacionDto confirmacion;
        try {
            confirmacion = aplicacion.aplicar(cambio.pasaje(), solicitud.idViajeNuevo(), solicitud.idAsiento(),
                    cambio.sesion().idSesion(), monto, solicitud.claveIdempotencia(), cambio.idEmpleado());
        } catch (PostergacionRechazadaException noSeAplico) {
            throw new PostergacionRechazadaException(noSeAplico.getCodigo(), noSeAplico.getReason()
                    + " El pago no se registró: si ya cobró, devuelva el dinero al pasajero.");
        }
        intento.setIdPostergacion(confirmacion.idPostergacion());
        auditoria.save(intento);
        return new ResultadoPagoCambioDto(true, resultado, metodo.name(), monto,
                "Pago aprobado y cambio realizado. Entregue al pasajero los datos de su nuevo viaje.", confirmacion);
    }

    @Transactional(readOnly = true)
    public List<IntentoPagoCambioDto> listarIntentos(int idPasaje) {
        List<AuditoriaPago> intentos =
                auditoria.findByIdPasajeAndConceptoOrderByIdAuditoriaPago(idPasaje, AuditoriaPago.CONCEPTO_CAMBIO_VIAJE);
        List<IntentoPagoCambioDto> respuesta = new ArrayList<>();
        int numero = 1;
        for (AuditoriaPago intento : intentos) {
            respuesta.add(new IntentoPagoCambioDto(numero, nombreDelMetodo(intento.getIdMetodoPago()),
                    intento.getMonto(), intento.getResultado(), intento.getNumeroOperacion(), intento.getFechaIntento()));
            numero++;
        }
        return respuesta;
    }

    private String resultadoDelPago(MetodoPagoAgencia metodo, String resultadoDelTerminal) {
        if (metodo.siempreAprobado()) {
            return AuditoriaPago.RESULTADO_APROBADO;
        }
        if (resultadoDelTerminal == null) {
            throw new PostergacionRechazadaException(FALTA_RESULTADO,
                    "Indique si el pago con " + metodo.nombreEnCatalogo() + " fue aprobado o rechazado.");
        }
        return resultadoDelTerminal;
    }

    // Tarjeta y Yape pasan por el POS: siempre se guarda su código.
    // Aprobado: código de operación del voucher. Rechazado: código de error que muestra el POS.
    // El efectivo no pasa por el POS, así que no lleva código.
    private String codigoDelPos(MetodoPagoAgencia metodo, String resultado, String codigoIngresado) {
        if (metodo == MetodoPagoAgencia.EFECTIVO) {
            return null;
        }
        String codigo = vacioANull(codigoIngresado);
        if (codigo == null) {
            String queCodigo = AuditoriaPago.RESULTADO_APROBADO.equals(resultado) ? "de operación" : "de error";
            throw new PostergacionRechazadaException(FALTA_CODIGO_POS,
                    "Ingrese el código " + queCodigo + " que muestra el POS.");
        }
        return codigo;
    }

    private int idMetodoEnCatalogo(MetodoPagoAgencia metodo) {
        return metodos.findByNombreMetodoAndActivoTrue(metodo.nombreEnCatalogo())
                .map(MetodoPago::getIdMetodoPago)
                .orElseThrow(() -> new PostergacionRechazadaException(METODO_NO_HABILITADO,
                        "El método " + metodo.nombreEnCatalogo() + " no está habilitado. Use otro método."));
    }

    private String nombreDelMetodo(Integer idMetodoPago) {
        return metodos.findById(idMetodoPago).map(MetodoPago::getNombreMetodo).orElse("Desconocido");
    }

    private ResultadoPagoCambioDto respuestaDe(AuditoriaPago intento) {
        String metodo = nombreDelMetodo(intento.getIdMetodoPago());
        if (intento.estaAprobado() && intento.getIdPostergacion() != null) {
            return new ResultadoPagoCambioDto(true, intento.getResultado(), metodo, intento.getMonto(),
                    "Este pago ya se había registrado y el cambio ya está hecho. No se cobró otra vez.",
                    aplicacion.confirmacionGuardada(intento.getIdPostergacion()));
        }
        return new ResultadoPagoCambioDto(false, intento.getResultado(), metodo, intento.getMonto(),
                "Este intento ya se había registrado como rechazado. Para reintentar, registre un nuevo intento.",
                null);
    }

    private static String vacioANull(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
