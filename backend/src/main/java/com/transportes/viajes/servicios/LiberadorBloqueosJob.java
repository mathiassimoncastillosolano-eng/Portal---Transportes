package com.transportes.viajes.servicios;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;

@Component
public class LiberadorBloqueosJob {

    private static final Logger log = LoggerFactory.getLogger(LiberadorBloqueosJob.class);

    private final ViajeAsientoRepositorio viajeAsientoRepositorio;

    public LiberadorBloqueosJob(ViajeAsientoRepositorio viajeAsientoRepositorio) {
        this.viajeAsientoRepositorio = viajeAsientoRepositorio;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void liberarBloqueosVencidos() {
        int filas = viajeAsientoRepositorio.liberarTodosBloqueosVencidos();
        if (filas > 0) {
            log.info("Job de liberación: {} asiento(s) con bloqueo vencido liberado(s)", filas);
        }
    }
}