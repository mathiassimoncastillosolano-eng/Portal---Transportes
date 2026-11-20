package com.transportes.pasajes.servicios;

import com.transportes.compras.reglas.ConstructorCompras;
import com.transportes.compras.reglas.ReglasCompra;
import com.transportes.compras.reglas.ReglasCompra.EstadoCompra;
import com.transportes.compras.reglas.ReglasCompra.FaseViaje;
import com.transportes.pasajes.dto.OpcionesFiltroPasajesDto;
import com.transportes.pasajes.dto.PaginaPasajesDto;
import com.transportes.pasajes.dto.PasajeDto;
import com.transportes.pasajes.dto.ResumenPasajesDto;
import com.transportes.pasajes.repositorios.PasajesRepositorio;
import com.transportes.pasajes.repositorios.PasajesRepositorio.FilaPasaje;
import com.transportes.pasajes.repositorios.PasajesRepositorio.FiltroPasajes;
import com.transportes.pasajes.repositorios.PasajesRepositorio.Totales;
import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasajesServicio {

    private static final int TAMANO_MAXIMO = 50;
    private static final int TERMINOS_MAXIMOS = 6;
    private static final Set<String> ORDENES = Set.of("salida", "precio", "pasajero");
    private static final Set<String> ESTADOS = Set.of("CONFIRMADA", "REEMBOLSADA", "SIN_CONFIRMAR");
    private static final Set<String> FASES = Set.of("PROXIMO", "REALIZADO", "OTROS");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final PasajesRepositorio repositorio;
    private final Clock reloj;

    public PasajesServicio(PasajesRepositorio repositorio, Clock relojNegocio) {
        this.repositorio = repositorio;
        this.reloj = relojNegocio;
    }

    @Transactional(readOnly = true)
    public PaginaPasajesDto listar(String q, Integer idPasajero, String origen, String destino, String desde,
            String hasta, String estado, String fase, String orden, String direccion, int pagina, int tamano) {
        if (pagina < 0 || tamano < 1 || tamano > TAMANO_MAXIMO) {
            throw solicitudInvalida("Paginación no válida.");
        }
        String ordenNormalizado = vacio(orden) ? "salida" : orden.trim();
        String estadoNormalizado = vacio(estado) ? null : estado.trim().toUpperCase(Locale.ROOT);
        String faseNormalizada = vacio(fase) ? null : fase.trim().toUpperCase(Locale.ROOT);
        if (!ORDENES.contains(ordenNormalizado)
                || (estadoNormalizado != null && !ESTADOS.contains(estadoNormalizado))
                || (faseNormalizada != null && !FASES.contains(faseNormalizada))) {
            throw solicitudInvalida("Filtro u orden no válido.");
        }
        LocalDate fechaDesde = fecha(desde);
        LocalDate fechaHasta = fecha(hasta);
        if (fechaDesde != null && fechaHasta != null && fechaDesde.isAfter(fechaHasta)) {
            throw solicitudInvalida("El rango de fechas no es válido.");
        }
        boolean ascendente = "asc".equalsIgnoreCase(direccion);
        FiltroPasajes filtro = new FiltroPasajes(terminos(q), idPasajero, vacio(origen) ? null : origen.trim(),
                vacio(destino) ? null : destino.trim(), fechaDesde, fechaHasta, estadoNormalizado, faseNormalizada,
                ordenNormalizado, ascendente, tamano, pagina * tamano);
        LocalDateTime ahora = LocalDateTime.now(reloj);
        Totales totales = repositorio.totales(filtro, ahora);
        List<PasajeDto> contenido = new ArrayList<>();
        for (FilaPasaje fila : repositorio.listar(filtro, ahora)) {
            contenido.add(aPasaje(fila));
        }
        return new PaginaPasajesDto(contenido, totales.total(), pagina, tamano,
                new ResumenPasajesDto(totales.confirmados(), totales.proximos(), totales.ingresos()));
    }

    @Transactional(readOnly = true)
    public OpcionesFiltroPasajesDto opciones() {
        LocalDateTime ahora = LocalDateTime.now(reloj);
        return new OpcionesFiltroPasajesDto(repositorio.origenes(ahora), repositorio.destinos(ahora));
    }

    private static PasajeDto aPasaje(FilaPasaje fila) {
        EstadoCompra estado = EstadoCompra.valueOf(fila.estado());
        FaseViaje fase = FaseViaje.valueOf(fila.fase());
        String horaLlegada = null;
        LocalDate fechaLlegada = null;
        if (fila.fechaSalida() != null && fila.horaSalida() != null && fila.duracionMin() != null) {
            LocalDateTime llegada = fila.fechaSalida().atTime(fila.horaSalida()).plusMinutes(fila.duracionMin());
            horaLlegada = llegada.format(HORA);
            fechaLlegada = llegada.toLocalDate();
        }
        String comprobante = fila.serie() != null && fila.numero() != null ? fila.serie() + "-" + fila.numero() : null;
        return new PasajeDto(
                fila.idPasaje(), ConstructorCompras.numeroBoleto(fila.idPasaje()), fila.idVenta(),
                ConstructorCompras.codigoCompra(fila.idVenta()), comprobante, fila.idPasajero(),
                (fila.nombres() + " " + fila.apellidos()).trim(),
                fila.tipoDocumento() + " " + fila.numeroDocumento(), fila.origen(), fila.destino(),
                fila.fechaSalida(), fila.horaSalida() == null ? null : fila.horaSalida().format(HORA),
                horaLlegada, fechaLlegada, fila.asiento(), fila.piso(), fila.tipoBus(), fila.precio(),
                fila.moneda() == null ? ConstructorCompras.MONEDA_POR_DEFECTO : fila.moneda(), estado.name(),
                fase.name(), ReglasCompra.documentoDisponible(estado, fase));
    }

    private static LocalDate fecha(String valor) {
        if (vacio(valor)) {
            return null;
        }
        try {
            return LocalDate.parse(valor.trim());
        } catch (DateTimeParseException e) {
            throw solicitudInvalida("Fecha no válida.");
        }
    }

    private static boolean vacio(String valor) {
        return valor == null || valor.isBlank();
    }

    private static ResponseStatusException solicitudInvalida(String motivo) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, motivo);
    }

    private static List<String> terminos(String q) {
        if (vacio(q)) {
            return List.of();
        }
        String normalizado = Normalizer.normalize(q.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        List<String> terminos = new ArrayList<>();
        for (String parte : normalizado.split("\\s+")) {
            if (!parte.isBlank() && terminos.size() < TERMINOS_MAXIMOS) {
                terminos.add(parte);
            }
        }
        return terminos;
    }
}
