package com.transportes.pagos.servicios;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.pagos.entidades.EstadoOperacion;
import com.transportes.pagos.repositorios.OperacionPagoRepositorio;

/** Tarea automática que revisa los pagos pendientes por si no llegó el aviso de Culqi. */
@Component
public class ConciliacionPagosJob {

    private static final Logger log = LoggerFactory.getLogger(ConciliacionPagosJob.class);
    private static final Set<EstadoOperacion> A_CONCILIAR = EnumSet.of(EstadoOperacion.CREANDO,
            EstadoOperacion.EN_PROCESO, EstadoOperacion.ACCION_REQUERIDA, EstadoOperacion.APROBADO_SIN_ASIENTOS);

    private final OperacionPagoRepositorio operaciones;
    private final PagoServicio pagoServicio;
    private final long segundosSinConsulta;

    public ConciliacionPagosJob(OperacionPagoRepositorio operaciones, PagoServicio pagoServicio,
                                @Value("${culqi.conciliacion-segundos-sin-consulta:20}") long segundosSinConsulta) {
        this.operaciones = operaciones;
        this.pagoServicio = pagoServicio;
        this.segundosSinConsulta = segundosSinConsulta;
    }

    /** Cada 30 segundos: vuelve a consultar los pagos pendientes. */
    @Scheduled(fixedDelayString = "${culqi.conciliacion-ms:30000}", initialDelayString = "${culqi.conciliacion-inicial-ms:30000}")
    public void conciliar() {
        List<Integer> ids;
        try {
            ids = operaciones.buscarParaConciliar(A_CONCILIAR, LocalDateTime.now().minusSeconds(segundosSinConsulta));
        } catch (Exception e) {
            log.error("Conciliación de pagos: no se pudo leer la base de datos", e);
            return;
        }
        for (Integer id : ids) {
            try {
                pagoServicio.sincronizar(id);
            } catch (Exception e) {
                log.error("Conciliación de pagos: falló la operación {}", id, e);
            }
        }
    }

    /** Cada 15 minutos: borra copias de pasajeros que ya no hacen falta. */
    @Scheduled(fixedDelayString = "${culqi.limpieza-ms:900000}", initialDelayString = "${culqi.limpieza-ms:900000}")
    @Transactional
    public void borrarDatosTemporales() {
        int filas = operaciones.borrarDatosPasajerosVencidos(PagoServicio.ACTIVOS, LocalDateTime.now().minusHours(1));
        if (filas > 0) {
            log.info("Se borraron los datos temporales de pasajeros de {} operación(es) cerradas", filas);
        }
    }
}
