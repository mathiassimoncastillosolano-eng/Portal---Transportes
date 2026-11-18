package com.transportes.compras.reglas;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.transportes.compras.dto.BoletoDto;
import com.transportes.compras.dto.CambioBoletoDto;
import com.transportes.compras.dto.CompraDto;
import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.dto.FilaResumen;
import com.transportes.compras.dto.ResumenPerfilDto;
import com.transportes.compras.dto.ViajeBoletoDto;
import com.transportes.compras.dto.ViajeFila;
import com.transportes.compras.reglas.ReglasCompra.EstadoCompra;
import com.transportes.compras.reglas.ReglasCompra.FaseViaje;

/**
 * Convierte las filas planas de la consulta (una por pasaje) en compras con sus boletos, las ordena y calcula los
 * indicadores del perfil. No accede a datos: recibe filas ya autorizadas por el repositorio (filtradas por el
 * usuario autenticado).
 */
public final class ConstructorCompras {

    /** El portal no modela una empresa transportista: la marca es RutaLibre (igual que la búsqueda de viajes). */
    public static final String EMPRESA = "RutaLibre";
    /** Moneda del sistema cuando la operación de pago no la informa (operacion_pago.moneda es PEN por defecto). */
    public static final String MONEDA_POR_DEFECTO = "PEN";

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private ConstructorCompras() {
    }

    /** Agrupa por venta conservando el orden de aparición de las filas. */
    public static List<CompraDto> agrupar(List<FilaCompra> filas, LocalDateTime ahora) {
        Map<Integer, List<FilaCompra>> porVenta = new LinkedHashMap<>();
        for (FilaCompra fila : filas) {
            porVenta.computeIfAbsent(fila.idVenta(), id -> new ArrayList<>()).add(fila);
        }
        List<CompraDto> compras = new ArrayList<>(porVenta.size());
        for (List<FilaCompra> grupo : porVenta.values()) {
            compras.add(construir(grupo, ahora));
        }
        return compras;
    }

    private static CompraDto construir(List<FilaCompra> grupo, LocalDateTime ahora) {
        FilaCompra cabecera = grupo.get(0);

        // Un pasaje no puede aparecer dos veces: si algún join multiplicara filas, se descarta el duplicado.
        Map<Integer, BoletoDto> boletos = new LinkedHashMap<>();
        // datosViaje = viaje en que se COMPRÓ la compra (aunque algún pasaje se haya cambiado después a otro viaje).
        FilaCompra datosViaje = null;
        // viajeMasTardio = viaje actual que sale más tarde: decide si la compra sigue "próxima" o ya se "realizó".
        FilaCompra viajeMasTardio = null;
        Set<Long> viajes = new HashSet<>();
        for (FilaCompra fila : grupo) {
            FilaCompra deLaCompra = fila.conViajeOriginal();
            if (deLaCompra.idViaje() != null) {
                viajes.add(deLaCompra.idViaje());
            }
            if (datosViaje == null && deLaCompra.fechaSalida() != null) {
                datosViaje = deLaCompra;
            }
            if (sale(fila) != null && (viajeMasTardio == null || sale(fila).isAfter(sale(viajeMasTardio)))) {
                viajeMasTardio = fila;
            }
            if (fila.idPasaje() != null && !boletos.containsKey(fila.idPasaje())) {
                boletos.put(fila.idPasaje(), aBoleto(fila));
            }
        }
        if (datosViaje == null) {
            datosViaje = cabecera;
        }
        if (viajeMasTardio == null) {
            viajeMasTardio = datosViaje;
        }

        BigDecimal totalPasajes = BigDecimal.ZERO;
        BigDecimal totalAdicionales = BigDecimal.ZERO;
        boolean boletoIncompleto = false;
        for (BoletoDto boleto : boletos.values()) {
            if (boleto.precio() != null) {
                totalPasajes = totalPasajes.add(boleto.precio());
            } else {
                boletoIncompleto = true;
            }
            if (boleto.adicionalPagado() != null) {
                totalAdicionales = totalAdicionales.add(boleto.adicionalPagado());
            }
            if (boleto.asiento() == null || boleto.pasajero() == null) {
                boletoIncompleto = true;
            }
        }

        EstadoCompra estado = ReglasCompra.estadoCompra(
                cabecera.estadoVenta(), cabecera.estadoPago(), cabecera.estadoOperacion());
        FaseViaje fase = ReglasCompra.faseViaje(
                viajeMasTardio.estadoViaje(), viajeMasTardio.fechaSalida(), viajeMasTardio.horaSalida(), ahora);

        boolean incompleta = boletos.isEmpty() || boletoIncompleto || viajes.size() > 1
                || datosViaje.origen() == null || datosViaje.destino() == null
                || datosViaje.fechaSalida() == null || datosViaje.horaSalida() == null
                || datosViaje.tipoBus() == null;

        BigDecimal total = cabecera.montoTotal();
        boolean consistente = total != null && !boletos.isEmpty() && total.compareTo(totalPasajes) == 0;
        // Lo pagado en total: la venta original más lo que se pagó en cada cambio de viaje.
        BigDecimal totalPagado = total == null ? null : total.add(totalAdicionales);

        String comprobante = cabecera.comprobanteSerie() != null && cabecera.comprobanteNumero() != null
                ? cabecera.comprobanteSerie() + "-" + cabecera.comprobanteNumero() : null;

        return new CompraDto(
                cabecera.idVenta(), codigoCompra(cabecera.idVenta()),
                estado.name(), cabecera.estadoVenta(), cabecera.estadoPago(),
                viajeMasTardio.estadoViaje(), fase.name(),
                ReglasCompra.esVigente(estado, fase), ReglasCompra.documentoDisponible(estado, fase), incompleta,
                datosViaje.origen(), datosViaje.destino(), datosViaje.fechaSalida(),
                datosViaje.horaSalida() == null ? null : datosViaje.horaSalida().format(HORA),
                EMPRESA, datosViaje.tipoBus(),
                List.copyOf(boletos.values()),
                total, totalPasajes, consistente,
                cabecera.moneda() == null ? MONEDA_POR_DEFECTO : cabecera.moneda(),
                cabecera.fechaVenta(), comprobante,
                datosViaje.idViaje(), totalPagado,
                horaLlegada(datosViaje.fechaSalida(), datosViaje.horaSalida(), datosViaje.duracionMin()),
                cabecera.idPago());
    }

    /** Fecha y hora de salida del viaje actual de la fila, o null si no se conocen. */
    private static LocalDateTime sale(FilaCompra fila) {
        if (fila.fechaSalida() == null || fila.horaSalida() == null) {
            return null;
        }
        return fila.fechaSalida().atTime(fila.horaSalida());
    }

    private static BoletoDto aBoleto(FilaCompra fila) {
        String nombre = (nulo(fila.nombres()) + " " + nulo(fila.apellidos())).trim();
        BigDecimal adicionalPagado = fila.adicionalPagado() == null ? BigDecimal.ZERO : fila.adicionalPagado();
        ViajeBoletoDto viajeVigente = new ViajeBoletoDto(
                fila.idViaje(), fila.origen(), fila.destino(), fila.fechaSalida(), formatearHora(fila.horaSalida()),
                horaLlegada(fila.fechaSalida(), fila.horaSalida(), fila.duracionMin()),
                EMPRESA, fila.tipoBus(), fila.numeroAsiento());
        return new BoletoDto(
                fila.idPasaje(), numeroBoleto(fila.idPasaje()),
                nombre.isEmpty() ? null : nombre,
                ReglasCompra.enmascararDocumento(fila.tipoDocumento(), fila.numeroDocumento()),
                fila.numeroAsiento(), fila.piso(), fila.precioPasaje(), adicionalPagado,
                viajeVigente, aCambio(fila, adicionalPagado));
    }

    /** Último cambio de viaje del boleto, o null si nunca se cambió. */
    private static CambioBoletoDto aCambio(FilaCompra fila, BigDecimal adicionalPagado) {
        ViajeFila anterior = fila.viajeAnterior();
        if (!fila.fueCambiado() || anterior == null) {
            return null;
        }
        ViajeBoletoDto viajeAnterior = new ViajeBoletoDto(
                anterior.idViaje(), anterior.origen(), anterior.destino(), anterior.fechaSalida(),
                formatearHora(anterior.horaSalida()),
                horaLlegada(anterior.fechaSalida(), anterior.horaSalida(), anterior.duracionMin()),
                EMPRESA, anterior.tipoBus(), anterior.numeroAsiento());
        return new CambioBoletoDto(viajeAnterior, adicionalPagado, fila.fechaCambio());
    }

    private static String formatearHora(LocalTime hora) {
        return hora == null ? null : hora.format(HORA);
    }

    /** Hora de llegada = salida + duración estimada de la ruta. Sin duración no se inventa: queda en null. */
    private static String horaLlegada(LocalDate fechaSalida, LocalTime horaSalida, Integer duracionMin) {
        if (fechaSalida == null || horaSalida == null || duracionMin == null) {
            return null;
        }
        return fechaSalida.atTime(horaSalida).plusMinutes(duracionMin).format(HORA);
    }

    /** Referencia visible de la compra, derivada de venta.id_venta (no es un código de validación). */
    public static String codigoCompra(int idVenta) {
        return String.format("RL-C-%06d", idVenta);
    }

    /** Referencia visible del boleto, derivada de pasaje.id_pasaje (no es un código de validación ni un QR). */
    public static String numeroBoleto(int idPasaje) {
        return String.format("RL-B-%06d", idPasaje);
    }

    /** Vigentes primero (salida más cercana arriba) y después el resto (más reciente arriba). */
    public static List<CompraDto> ordenarParaPasajes(List<CompraDto> compras) {
        List<CompraDto> vigentes = new ArrayList<>();
        List<CompraDto> otras = new ArrayList<>();
        for (CompraDto compra : compras) {
            (compra.vigente() ? vigentes : otras).add(compra);
        }
        vigentes.sort(Comparator.comparing(ConstructorCompras::salida, Comparator.nullsLast(Comparator.naturalOrder())));
        otras.sort(ORDEN_RECIENTE);
        List<CompraDto> resultado = new ArrayList<>(compras.size());
        resultado.addAll(vigentes);
        resultado.addAll(otras);
        return resultado;
    }

    /** Todo lo que no es una compra vigente, de la salida más reciente a la más antigua. */
    public static List<CompraDto> paraHistorial(List<CompraDto> compras) {
        List<CompraDto> historial = new ArrayList<>();
        for (CompraDto compra : compras) {
            if (!compra.vigente()) {
                historial.add(compra);
            }
        }
        historial.sort(ORDEN_RECIENTE);
        return historial;
    }

    /** Cuántos pasajes vigentes (confirmados y por viajar) hay en total. */
    public static int contarVigentes(List<CompraDto> compras) {
        int vigentes = 0;
        for (CompraDto compra : compras) {
            if (compra.vigente()) {
                vigentes++;
            }
        }
        return vigentes;
    }

    private static final Comparator<CompraDto> ORDEN_RECIENTE = Comparator
            .comparing(ConstructorCompras::salida, Comparator.nullsLast(Comparator.<LocalDateTime>naturalOrder().reversed()))
            .thenComparing(Comparator.comparing(CompraDto::idVenta).reversed());

    private static LocalDateTime salida(CompraDto compra) {
        if (compra.fechaSalida() == null || compra.horaSalida() == null) {
            return null;
        }
        return compra.fechaSalida().atTime(LocalTime.parse(compra.horaSalida(), HORA));
    }

    /**
     * Indicadores del perfil (ver {@link ResumenPerfilDto}). Solo cuentan compras CONFIRMADAS; cada pasaje y cada
     * viaje se cuenta una única vez aunque la consulta devuelva filas repetidas.
     */
    public static ResumenPerfilDto resumen(List<FilaResumen> filas, LocalDateTime ahora) {
        Map<Integer, List<FilaResumen>> porVenta = new LinkedHashMap<>();
        for (FilaResumen fila : filas) {
            porVenta.computeIfAbsent(fila.idVenta(), id -> new ArrayList<>()).add(fila);
        }

        Set<Integer> pasajes = new HashSet<>();
        Set<Integer> tickets = new HashSet<>();
        Set<Long> viajesCompletados = new HashSet<>();
        int comprasVigentes = 0;

        for (List<FilaResumen> grupo : porVenta.values()) {
            FilaResumen cabecera = grupo.get(0);
            EstadoCompra estado = ReglasCompra.estadoCompra(
                    cabecera.estadoVenta(), cabecera.estadoPago(), cabecera.estadoOperacion());
            if (estado != EstadoCompra.CONFIRMADA) {
                continue;
            }
            FilaResumen viaje = cabecera;
            for (FilaResumen fila : grupo) {
                if (fila.fechaSalida() != null) {
                    viaje = fila;
                    break;
                }
            }
            FaseViaje fase = ReglasCompra.faseViaje(viaje.estadoViaje(), viaje.fechaSalida(), viaje.horaSalida(), ahora);
            boolean emitible = ReglasCompra.documentoDisponible(estado, fase);

            for (FilaResumen fila : grupo) {
                if (fila.idPasaje() == null) {
                    continue;
                }
                pasajes.add(fila.idPasaje());
                if (emitible) {
                    tickets.add(fila.idPasaje());
                }
                if (fase == FaseViaje.REALIZADO && fila.idViaje() != null) {
                    viajesCompletados.add(fila.idViaje());
                }
            }
            if (ReglasCompra.esVigente(estado, fase)) {
                comprasVigentes++;
            }
        }
        return new ResumenPerfilDto(pasajes.size(), viajesCompletados.size(), tickets.size(), comprasVigentes);
    }

    private static String nulo(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
