package com.transportes.postergacion.servicios;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.empleados.entidades.Empleado;
import com.transportes.empleados.servicios.EmpleadoService;
import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.dto.ConfirmarCambioAgenciaRequest;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.dto.CotizacionCambioDto;
import com.transportes.postergacion.dto.ElegibilidadCambioDto;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.reglas.ComparacionTarifaCambio;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.excepciones.SesionExpiradaException;
import com.transportes.viajes.excepciones.SesionInvalidaException;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.TokenSesionServicio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;

/**
 * Cambio de viajes desde el Sistema Empresarial: el personal de agencia cambia el pasaje de un cliente.
 * A diferencia del Portal, el pasaje se busca por su id porque el agente no es el dueño de la compra.
 * Las reglas (pasaje vigente y 6 h de anticipación) son las mismas de PostergacionServicio.
 */
@Service
public class CambioViajeAgenciaServicio {

    // Códigos propios del SE (los del Portal están en PostergacionRechazadaException).
    public static final String ACEPTACION_REQUERIDA = "ACEPTACION_REQUERIDA";
    public static final String PAGO_REQUERIDO = "PAGO_REQUERIDO";

    private final CompraRepositorio compras;
    private final PostergacionServicio postergaciones;
    private final ViajeAsientoRepositorio asientos;
    private final TokenSesionServicio tokens;
    private final EmpleadoService empleados;
    private final AplicacionCambioViaje aplicacion;

    public CambioViajeAgenciaServicio(CompraRepositorio compras, PostergacionServicio postergaciones,
                                      ViajeAsientoRepositorio asientos, TokenSesionServicio tokens,
                                      EmpleadoService empleados, AplicacionCambioViaje aplicacion) {
        this.compras = compras;
        this.postergaciones = postergaciones;
        this.asientos = asientos;
        this.tokens = tokens;
        this.empleados = empleados;
        this.aplicacion = aplicacion;
    }

    // No lanza error si no se puede: responde elegible = false con el motivo.
    @Transactional(readOnly = true)
    public ElegibilidadCambioDto consultarElegibilidad(int idPasaje) {
        FilaCompra pasaje = buscarPasaje(idPasaje);
        try {
            postergaciones.exigirCambiable(pasaje);
            return ElegibilidadCambioDto.aceptada();
        } catch (PostergacionRechazadaException rechazo) {
            return ElegibilidadCambioDto.rechazada(rechazo.getCodigo(), rechazo.getReason());
        }
    }

    @Transactional(readOnly = true)
    public ConsultaPostergacionDto consultarViajes(int idPasaje, String origen, String destino, LocalDate fecha) {
        FilaCompra pasaje = buscarPasaje(idPasaje);
        postergaciones.exigirCambiable(pasaje);
        return postergaciones.listarViajesSinElOriginal(pasaje, origen, destino, fecha);
    }

    @Transactional(readOnly = true)
    public CotizacionCambioDto cotizar(int idPasaje, long idViajeNuevo, int idAsiento) {
        FilaCompra pasaje = buscarPasaje(idPasaje);
        postergaciones.exigirCambiable(pasaje);
        return CotizacionCambioDto.desde(compararTarifa(pasaje, idViajeNuevo, idAsiento));
    }

    // Todo lo que se revisa antes de aplicar un cambio, con o sin cobro.
    public record CambioPreparado(FilaCompra pasaje, SesionReserva sesion,
                                  ComparacionTarifaCambio.Resultado tarifa, int idEmpleado) {
    }

    // Mismo candado que usa el Portal: si el cliente y un agente cambian el mismo pasaje a la vez, van en fila.
    // Se libera solo al terminar la transacción.
    public void bloquearPasaje(int idPasaje) {
        asientos.bloquearSesion("postergacion:" + idPasaje);
    }

    @Transactional
    public CambioPreparado prepararCambio(int idUsuarioAgente, int idPasaje, long idViajeNuevo, int idAsiento,
                                          String tokenSesion) {
        int idEmpleado = idEmpleadoActivo(idUsuarioAgente);
        FilaCompra pasaje = buscarPasaje(idPasaje);
        postergaciones.exigirCambiable(pasaje);
        SesionReserva sesion = validarSesion(tokenSesion, idViajeNuevo);
        return new CambioPreparado(pasaje, sesion, compararTarifa(pasaje, idViajeNuevo, idAsiento), idEmpleado);
    }

    // Cambio cuando la tarifa nueva es igual o menor. Si es mayor, primero se registra el pago (PagoDiferenciaCambioServicio).
    @Transactional
    public ConfirmacionPostergacionDto confirmarSinCobro(int idUsuarioAgente, int idPasaje,
                                                         ConfirmarCambioAgenciaRequest solicitud) {
        idEmpleadoActivo(idUsuarioAgente); // quien no es agente activo no llega a bloquear el pasaje
        bloquearPasaje(idPasaje);
        CambioPreparado cambio = prepararCambio(idUsuarioAgente, idPasaje, solicitud.idViajeNuevo(),
                solicitud.idAsiento(), solicitud.tokenSesion());
        FilaCompra pasaje = cambio.pasaje();
        SesionReserva sesion = cambio.sesion();
        ComparacionTarifaCambio.Resultado tarifa = cambio.tarifa();
        int idEmpleado = cambio.idEmpleado();

        if (tarifa.requierePago()) {
            throw new PostergacionRechazadaException(PAGO_REQUERIDO,
                    "El nuevo viaje cuesta S/ " + tarifa.montoAPagar().toPlainString()
                    + " más. Registre primero el pago de la diferencia.");
        }
        if (tarifa.requiereAceptacion() && !solicitud.aceptaSinDevolucion()) {
            throw new PostergacionRechazadaException(ACEPTACION_REQUERIDA,
                    "Antes de confirmar, indique que informó al pasajero que la diferencia de S/ "
                    + tarifa.montoNoDevuelto().toPlainString() + " no se devuelve y que él lo acepta.");
        }

        return aplicacion.aplicar(pasaje, solicitud.idViajeNuevo(), solicitud.idAsiento(), sesion.idSesion(),
                BigDecimal.ZERO.setScale(2), null, idEmpleado);
    }

    private ComparacionTarifaCambio.Resultado compararTarifa(FilaCompra pasaje, long idViajeNuevo, int idAsiento) {
        if (Objects.equals(pasaje.idViaje(), idViajeNuevo)) {
            throw new PostergacionRechazadaException(PostergacionRechazadaException.MISMO_VIAJE,
                    "El pasaje ya está en ese viaje. Revise si el cambio ya se registró o elija otro viaje.");
        }
        ViajeAsiento asientoNuevo = buscarAsiento(idViajeNuevo, idAsiento);
        BigDecimal importePagado = ComparacionTarifaCambio.importePagado(pasaje.precioPasaje(), pasaje.adicionalPagado());
        return ComparacionTarifaCambio.comparar(importePagado, asientoNuevo.getPrecio());
    }

    private FilaCompra buscarPasaje(int idPasaje) {
        return compras.filaDelPasaje(idPasaje)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No encontramos este pasaje."));
    }

    private ViajeAsiento buscarAsiento(long idViaje, int idAsiento) {
        return asientos.findByIdViajeAndIdAsiento(Math.toIntExact(idViaje), idAsiento)
                .orElseThrow(() -> new PostergacionRechazadaException(
                        PostergacionRechazadaException.ASIENTO_NO_DISPONIBLE,
                        "El asiento elegido no existe en ese viaje."));
    }

    private int idEmpleadoActivo(int idUsuario) {
        return empleados.buscarEmpleadoActivo(idUsuario)
                .map(Empleado::getIdEmpleado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Su cuenta no está registrada como personal de agencia activo."));
    }

    private SesionReserva validarSesion(String tokenSesion, long idViajeNuevo) {
        try {
            return tokens.validar(tokenSesion, idViajeNuevo);
        } catch (SesionExpiradaException expirada) {
            throw new PostergacionRechazadaException(PostergacionRechazadaException.SESION_VENCIDA,
                    "La reserva temporal del asiento venció. Vuelva a elegir el asiento; el pasaje no fue modificado.");
        } catch (SesionInvalidaException invalida) {
            throw new PostergacionRechazadaException(PostergacionRechazadaException.SESION_VENCIDA,
                    "La reserva temporal del asiento no es válida. Vuelva a elegir el asiento; el pasaje no fue modificado.");
        }
    }
}
