package com.transportes.postergacion.servicios;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Objects;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.pagos.entidades.OperacionPago;
import com.transportes.pagos.entidades.Pasaje;
import com.transportes.pagos.repositorios.PasajeRepositorio;
import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.dto.ConfirmarPostergacionRequest;
import com.transportes.postergacion.entidades.Postergacion;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.repositorios.PostergacionRepositorio;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.eventos.AsientoCambiadoEvento;
import com.transportes.viajes.excepciones.ReservaNoPermitidaException;
import com.transportes.viajes.excepciones.SesionExpiradaException;
import com.transportes.viajes.excepciones.SesionInvalidaException;
import com.transportes.viajes.excepciones.ViajeNoEncontradoException;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.TokenSesionServicio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;
import com.transportes.viajes.servicios.ValidadorReservaViaje;

import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.ASIENTO_NO_DISPONIBLE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.CAMBIO_NO_APLICADO;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.MISMO_VIAJE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.PAGO_INSUFICIENTE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.SESION_VENCIDA;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.VIAJE_NO_RESERVABLE;

@Service
public class ConfirmacionPostergacionServicio {

    private static final String MOTIVO_ASIENTO =
            "El asiento que elegiste dejó de estar disponible. Tu pasaje original no fue modificado.";

    private final PostergacionServicio postergaciones;
    private final PasajeRepositorio pasajes;
    private final ViajeAsientoRepositorio asientos;
    private final PostergacionRepositorio historial;
    private final CompraRepositorio compras;
    private final TokenSesionServicio tokens;
    private final ValidadorReservaViaje validadorReserva;
    private final ApplicationEventPublisher publicador;
    private final Clock reloj;

    public ConfirmacionPostergacionServicio(PostergacionServicio postergaciones, PasajeRepositorio pasajes,
                                            ViajeAsientoRepositorio asientos, PostergacionRepositorio historial,
                                            CompraRepositorio compras, TokenSesionServicio tokens,
                                            ValidadorReservaViaje validadorReserva,
                                            ApplicationEventPublisher publicador, Clock relojNegocio) {
        this.postergaciones = postergaciones;
        this.pasajes = pasajes;
        this.asientos = asientos;
        this.historial = historial;
        this.compras = compras;
        this.tokens = tokens;
        this.validadorReserva = validadorReserva;
        this.publicador = publicador;
        this.reloj = relojNegocio;
    }

    @Transactional
    public ConfirmacionPostergacionDto confirmar(int idUsuario, int idPasaje, ConfirmarPostergacionRequest solicitud) {
        asientos.bloquearSesion("postergacion:" + idPasaje);
        FilaCompra antes = postergaciones.exigirPasajeCambiable(idUsuario, idPasaje);
        SesionReserva sesion = validarSesion(solicitud.tokenSesion(), solicitud.idViajeNuevo());
        return aplicar(idUsuario, idPasaje, antes, solicitud.idViajeNuevo(), solicitud.idAsiento(),
                sesion.idSesion(), null, null);
    }

    @Transactional
    public ConfirmacionPostergacionDto aplicarCambioPagado(OperacionPago operacion) {
        int idPasaje = operacion.getIdPasaje();
        asientos.bloquearSesion("postergacion:" + idPasaje);
        FilaCompra antes = postergaciones.exigirPasajeCambiable(operacion.getIdUsuario(), idPasaje);
        return aplicar(operacion.getIdUsuario(), idPasaje, antes, operacion.getIdViaje(),
                operacion.getIdAsientoNuevo(), operacion.getIdSesionReserva(), operacion.getMonto(),
                operacion.getReferenciaExterna());
    }

    @Transactional(readOnly = true)
    public ConfirmacionPostergacionDto resultadoDelPago(int idUsuario, String referencia) {
        Postergacion fila = historial.findByReferenciaPago(referencia)
                .orElseThrow(() -> rechazo(CAMBIO_NO_APLICADO, "No encontramos el cambio de este pago."));
        FilaCompra despues = filaDelPasaje(idUsuario, fila.getIdPasaje());
        return new ConfirmacionPostergacionDto(true, fila.getIdPostergacion(), fila.getIdPasaje(), fila.getIdVenta(),
                fila.getIdViajeAnterior(), null,
                despues.idViaje(), despues.origen(), despues.destino(), despues.fechaSalida(), despues.horaSalida(),
                despues.numeroAsiento(), fila.getImporteAdicional(), fila.getReferenciaPago(),
                fila.getFechaPostergacion());
    }

    @Transactional(readOnly = true)
    public BigDecimal diferenciaDelCambio(int idUsuario, int idPasaje, long idViajeNuevo, int idAsiento) {
        FilaCompra antes = postergaciones.exigirPasajeCambiable(idUsuario, idPasaje);
        Pasaje pasaje = pasajes.findById(idPasaje)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No encontramos este pasaje entre tus compras."));
        ViajeAsiento nuevo = asientos.findByIdViajeAndIdAsiento(Math.toIntExact(idViajeNuevo), idAsiento)
                .orElseThrow(() -> rechazo(ASIENTO_NO_DISPONIBLE, MOTIVO_ASIENTO));
        return diferencia(pasaje, antes, nuevo);
    }

    private ConfirmacionPostergacionDto aplicar(int idUsuario, int idPasaje, FilaCompra antes, Long idViajeNuevo,
                                                Integer idAsiento, String idSesion, BigDecimal montoPagado,
                                                String referenciaPago) {
        Pasaje pasaje = pasajes.findById(idPasaje)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No encontramos este pasaje entre tus compras."));
        ViajeAsiento original = asientos.findById(pasaje.getIdViajeAsiento())
                .orElseThrow(() -> rechazo(CAMBIO_NO_APLICADO,
                        "No pudimos leer el asiento actual de tu pasaje. No se hizo ningún cambio."));
        ViajeAsiento nuevo = asientos.findByIdViajeAndIdAsiento(Math.toIntExact(idViajeNuevo), idAsiento)
                .orElseThrow(() -> rechazo(ASIENTO_NO_DISPONIBLE, MOTIVO_ASIENTO));

        if (Objects.equals(nuevo.getIdViajeAsiento(), original.getIdViajeAsiento())
                || Objects.equals(nuevo.getIdViaje(), original.getIdViaje())) {
            throw rechazo(MISMO_VIAJE, "Elige un viaje distinto al original.");
        }
        exigirViajeReservable(idViajeNuevo);
        BigDecimal importe = importeAplicable(diferencia(pasaje, antes, nuevo), montoPagado, referenciaPago);

        if (asientos.ocuparAsientoDeSesion(nuevo.getIdViajeAsiento(), idSesion, pasaje.getIdPasajero()) != 1) {
            throw rechazo(ASIENTO_NO_DISPONIBLE, MOTIVO_ASIENTO);
        }
        if (historial.moverPasajeAlAsiento(idPasaje, original.getIdViajeAsiento(), nuevo.getIdViajeAsiento()) != 1) {
            throw rechazo(CAMBIO_NO_APLICADO, "No pudimos actualizar tu pasaje. No se hizo ningún cambio.");
        }
        if (historial.liberarAsientoOcupado(original.getIdViajeAsiento()) != 1) {
            throw rechazo(CAMBIO_NO_APLICADO, "No pudimos liberar tu asiento anterior. No se hizo ningún cambio.");
        }

        LocalDateTime ahora = LocalDateTime.now(reloj);
        Postergacion fila = new Postergacion();
        fila.setIdPasaje(idPasaje);
        fila.setIdVenta(pasaje.getIdVenta());
        fila.setIdViajeAnterior(original.getIdViaje().longValue());
        fila.setIdViajeNuevo(nuevo.getIdViaje().longValue());
        fila.setIdViajeAsientoAnterior(original.getIdViajeAsiento());
        fila.setIdViajeAsientoNuevo(nuevo.getIdViajeAsiento());
        fila.setImporteAdicional(importe);
        fila.setReferenciaPago(importe.signum() > 0 ? referenciaPago : null);
        fila.setFechaPostergacion(ahora);
        fila = historial.save(fila);

        FilaCompra despues = filaDelPasaje(idUsuario, idPasaje);

        publicador.publishEvent(new AsientoCambiadoEvento(
                original.getIdViaje().longValue(), original.getIdAsiento(), "disponible"));
        publicador.publishEvent(new AsientoCambiadoEvento(
                nuevo.getIdViaje().longValue(), nuevo.getIdAsiento(), "ocupado"));

        return new ConfirmacionPostergacionDto(true, fila.getIdPostergacion(), idPasaje, pasaje.getIdVenta(),
                original.getIdViaje(), antes.numeroAsiento(),
                despues.idViaje(), despues.origen(), despues.destino(), despues.fechaSalida(), despues.horaSalida(),
                despues.numeroAsiento(), importe, fila.getReferenciaPago(), ahora);
    }

    private FilaCompra filaDelPasaje(int idUsuario, int idPasaje) {
        return compras.filasDelUsuario(idUsuario).stream()
                .filter(f -> Objects.equals(f.idPasaje(), idPasaje))
                .findFirst()
                .orElseThrow(() -> rechazo(CAMBIO_NO_APLICADO,
                        "No pudimos leer tu pasaje actualizado. No se hizo ningún cambio."));
    }

    private SesionReserva validarSesion(String tokenSesion, Long idViajeNuevo) {
        try {
            return tokens.validar(tokenSesion, idViajeNuevo);
        } catch (SesionExpiradaException expirada) {
            throw rechazo(SESION_VENCIDA,
                    "La reserva de tu asiento venció. Tu pasaje original no fue modificado.");
        } catch (SesionInvalidaException invalida) {
            throw rechazo(SESION_VENCIDA,
                    "La reserva de tu asiento ya no es válida. Tu pasaje original no fue modificado.");
        }
    }

    private void exigirViajeReservable(Long idViajeNuevo) {
        try {
            validadorReserva.exigirReservable(idViajeNuevo);
        } catch (ReservaNoPermitidaException noReservable) {
            throw rechazo(VIAJE_NO_RESERVABLE, noReservable.getMessage());
        } catch (ViajeNoEncontradoException inexistente) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, inexistente.getMessage());
        }
    }

    private BigDecimal diferencia(Pasaje pasaje, FilaCompra antes, ViajeAsiento nuevo) {
        BigDecimal adicionalPrevio = antes.adicionalPagado() == null ? BigDecimal.ZERO : antes.adicionalPagado();
        BigDecimal pagadoHastaAhora = pasaje.getPrecio().add(adicionalPrevio);
        return nuevo.getPrecio().subtract(pagadoHastaAhora).max(BigDecimal.ZERO);
    }

    private BigDecimal importeAplicable(BigDecimal diferencia, BigDecimal montoPagado, String referenciaPago) {
        if (montoPagado == null) {
            if (diferencia.signum() > 0) {
                throw rechazo(PAGO_INSUFICIENTE,
                        "Este cambio tiene una diferencia de tarifa que debes pagar. Tu pasaje original no fue modificado.");
            }
            return BigDecimal.ZERO;
        }
        if (montoPagado.compareTo(diferencia) < 0) {
            throw rechazo(PAGO_INSUFICIENTE,
                    "El pago no cubre la diferencia de tarifa. Tu pasaje original no fue modificado.");
        }
        if (montoPagado.signum() > 0 && (referenciaPago == null || referenciaPago.isBlank())) {
            throw rechazo(PAGO_INSUFICIENTE,
                    "Falta la referencia del pago adicional. Tu pasaje original no fue modificado.");
        }
        return montoPagado;
    }

    private static PostergacionRechazadaException rechazo(String codigo, String motivo) {
        return new PostergacionRechazadaException(codigo, motivo);
    }
}
