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

/**
 * Respaldo de los Webhooks: consulta en Mercado Pago las operaciones que siguen pendientes (p. ej. si el backend
 * estaba dormido en Render cuando llegó la notificación), vence las que superaron su ventana de pago, reintenta
 * reembolsos pendientes y borra las copias temporales de datos de pasajeros.
 */
@Component
public class ConciliacionPagosJob {

    private static final Logger log = LoggerFactory.getLogger(ConciliacionPagosJob.class);
    private static final Set<EstadoOperacion> A_CONCILIAR = EnumSet.of(EstadoOperacion.CREANDO,
            EstadoOperacion.EN_PROCESO, EstadoOperacion.ACCION_REQUERIDA, EstadoOperacion.APROBADO_SIN_ASIENTOS);

    private final OperacionPagoRepositorio operaciones;
    private final PagoServicio pagoServicio;
    private final long segundosSinConsulta;

    public ConciliacionPagosJob(OperacionPagoRepositorio operaciones, PagoServicio pagoServicio,
                                @Value("${mercadopago.conciliacion-segundos-sin-consulta:20}") long segundosSinConsulta) {
        this.operaciones = operaciones;
        this.pagoServicio = pagoServicio;
        this.segundosSinConsulta = segundosSinConsulta;
    }

    @Scheduled(fixedDelayString = "${mercadopago.conciliacion-ms:30000}", initialDelayString = "${mercadopago.conciliacion-inicial-ms:30000}")
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

    @Scheduled(fixedDelayString = "${mercadopago.limpieza-ms:900000}", initialDelayString = "${mercadopago.limpieza-ms:900000}")
    @Transactional
    public void borrarDatosTemporales() {
        int filas = operaciones.borrarDatosPasajerosVencidos(PagoServicio.ACTIVOS, LocalDateTime.now().minusHours(1));
        if (filas > 0) {
            log.info("Se borraron los datos temporales de pasajeros de {} operación(es) cerradas", filas);
        }
    }
}
