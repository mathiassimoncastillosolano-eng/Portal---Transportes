package com.transportes.dashboard.servicios;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.dashboard.dto.DashboardDto;
import com.transportes.dashboard.dto.OpcionesDashboardDto;
import com.transportes.dashboard.dto.PeriodoDto;
import com.transportes.dashboard.dto.RangoDto;
import com.transportes.dashboard.dto.VentaDto;
import com.transportes.dashboard.repositorios.DashboardRepositorio;
import com.transportes.dashboard.repositorios.DashboardRepositorio.FiltroDashboard;
import com.transportes.dashboard.repositorios.DashboardRepositorio.FilaVenta;
import com.transportes.pagos.entidades.EntornoPago;

/**
 * Reglas del Dashboard del gerente: valida los filtros, calcula el período anterior comparable y arma la
 * respuesta con los datos del repositorio. Las sumas (KPIs, rankings) las hace el frontend con estos hechos.
 */
@Service
public class DashboardServicio {

    /** Máximo de días que se pueden consultar de una vez (un año). */
    static final int DIAS_MAXIMOS = 366;

    /** Estado con el que el frontend reconoce una venta válida. */
    private static final String ESTADO_EMITIDO = "emitido";

    private final DashboardRepositorio repositorio;
    private final Clock reloj;

    public DashboardServicio(DashboardRepositorio repositorio, Clock relojNegocio) {
        this.repositorio = repositorio;
        this.reloj = relojNegocio;
    }

    /**
     * Ventas del rango pedido y del período anterior de igual duración.
     * Ejemplo: del 11 al 20 de noviembre (10 días) se compara con el 1 al 10 de noviembre.
     */
    @Transactional(readOnly = true)
    public DashboardDto obtener(String desde, String hasta, String entorno, Long idAgencia, Long idTipoBus,
            String destino) {
        LocalDate fechaDesde = fechaObligatoria(desde, "desde");
        LocalDate fechaHasta = fechaObligatoria(hasta, "hasta");
        if (fechaDesde.isAfter(fechaHasta)) {
            throw solicitudInvalida("La fecha de inicio no puede ser posterior a la de fin.");
        }
        long dias = ChronoUnit.DAYS.between(fechaDesde, fechaHasta) + 1;
        if (dias > DIAS_MAXIMOS) {
            throw solicitudInvalida("El rango no puede superar " + DIAS_MAXIMOS + " días.");
        }
        String entornoValido = entornoValido(entorno);
        String destinoLimpio = destino == null || destino.isBlank() ? null : destino.trim();

        LocalDate anteriorHasta = fechaDesde.minusDays(1);
        LocalDate anteriorDesde = anteriorHasta.minusDays(dias - 1);

        LocalDateTime ahora = LocalDateTime.now(reloj);
        PeriodoDto actual = periodo(
                new FiltroDashboard(fechaDesde, fechaHasta, entornoValido, idAgencia, idTipoBus, destinoLimpio), ahora);
        PeriodoDto anterior = periodo(
                new FiltroDashboard(anteriorDesde, anteriorHasta, entornoValido, idAgencia, idTipoBus, destinoLimpio),
                ahora);
        return new DashboardDto(actual, anterior);
    }

    /** Opciones de los filtros (agencias, tipos de bus, destinos) y la fecha de hoy en Perú. */
    @Transactional(readOnly = true)
    public OpcionesDashboardDto opciones() {
        return new OpcionesDashboardDto(repositorio.agencias(), repositorio.tiposDeBus(), repositorio.destinos(),
                LocalDate.now(reloj));
    }

    /** Arma un período: convierte cada fila en VentaDto y calcula la ocupación de los viajes que ya salieron. */
    private PeriodoDto periodo(FiltroDashboard filtro, LocalDateTime ahora) {
        List<VentaDto> ventas = new ArrayList<>();
        Set<Long> viajesQueYaSalieron = new LinkedHashSet<>();
        for (FilaVenta fila : repositorio.ventas(filtro, ahora)) {
            ventas.add(new VentaDto(
                    String.valueOf(fila.idViaje()),
                    fila.fecha(),
                    fila.precio(),
                    ESTADO_EMITIDO,
                    texto(fila.idCiudadSalida()),
                    texto(fila.idTipoBus()),
                    fila.origen(),
                    fila.destino()));
            if (fila.yaSalio()) {
                viajesQueYaSalieron.add(fila.idViaje());
            }
        }
        RangoDto rango = new RangoDto(filtro.desde(), filtro.hasta());
        return new PeriodoDto(rango, ventas, repositorio.ocupacion(viajesQueYaSalieron));
    }

    /** SANDBOX (ventas de prueba) o PRODUCTION (ventas reales). Si no se indica, se usa PRODUCTION. */
    private static String entornoValido(String entorno) {
        if (entorno == null || entorno.isBlank()) {
            return EntornoPago.PRODUCTION.name();
        }
        EntornoPago valor = EntornoPago.desde(entorno);
        if (valor == null) {
            throw solicitudInvalida("El entorno debe ser SANDBOX o PRODUCTION.");
        }
        return valor.name();
    }

    private static LocalDate fechaObligatoria(String valor, String nombre) {
        if (valor == null || valor.isBlank()) {
            throw solicitudInvalida("Falta la fecha '" + nombre + "'.");
        }
        try {
            return LocalDate.parse(valor.trim());
        } catch (DateTimeParseException e) {
            throw solicitudInvalida("La fecha '" + nombre + "' no es válida (formato AAAA-MM-DD).");
        }
    }

    /** Convierte un id a texto; null se vuelve "sin-dato" para que el frontend lo agrupe aparte. */
    private static String texto(Long id) {
        return id == null ? "sin-dato" : String.valueOf(id);
    }

    private static ResponseStatusException solicitudInvalida(String motivo) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, motivo);
    }
}
