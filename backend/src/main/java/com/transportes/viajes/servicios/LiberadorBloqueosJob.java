package com.transportes.viajes.servicios;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class LiberadorBloqueosJob {

    private static final Logger log = LoggerFactory.getLogger(LiberadorBloqueosJob.class);

    private final ViajeAsientoServicio viajeAsientoServicio;

    public LiberadorBloqueosJob(ViajeAsientoServicio viajeAsientoServicio) {
        this.viajeAsientoServicio = viajeAsientoServicio;
    }

    @Scheduled(fixedDelayString = "${reserva.job-liberacion-ms:5000}")
    public void liberarBloqueosVencidos() {
        try {
            int filas = viajeAsientoServicio.liberarVencidosGlobal();
            if (filas > 0) {
                log.info("Job de liberación: {} asiento(s) vencido(s) liberado(s)", filas);
            }
        } catch (Exception e) {
            log.error("Fallo en el job de liberación de bloqueos", e);
        }
    }
}