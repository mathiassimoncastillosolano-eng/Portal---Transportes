package com.transportes.viajes.servicios;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.transportes.viajes.dto.AsientoEventoDTO;
import com.transportes.viajes.eventos.AsientoCambiadoEvento;

@Service
public class AsientoSseServicio {

    private static final Logger log = LoggerFactory.getLogger(AsientoSseServicio.class);

    private final Map<Long, List<SseEmitter>> emisoresPorViaje = new ConcurrentHashMap<>();

    public SseEmitter suscribir(Long idViaje) {
        SseEmitter emisor = new SseEmitter(0L); // sin timeout; el heartbeat detecta conexiones muertas
        List<SseEmitter> lista = emisoresPorViaje.computeIfAbsent(idViaje, k -> new CopyOnWriteArrayList<>());
        lista.add(emisor);

        Runnable quitar = () -> quitar(idViaje, emisor);
        emisor.onCompletion(quitar);
        emisor.onTimeout(quitar);
        emisor.onError(e -> quitar.run());

        enviar(idViaje, emisor, SseEmitter.event().name("conectado").data("ok"));
        return emisor;
    }

    /** Con fallbackExecution también se dispara si se publica fuera de una transacción (p. ej. el job). */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void alCambiarAsiento(AsientoCambiadoEvento evento) {
        List<SseEmitter> lista = emisoresPorViaje.get(evento.idViaje());
        if (lista == null || lista.isEmpty()) {
            return;
        }
        AsientoEventoDTO dto = new AsientoEventoDTO(evento.idAsiento(), evento.estado());
        for (SseEmitter emisor : lista) {
            enviar(evento.idViaje(), emisor, SseEmitter.event().name("asiento").data(dto));
        }
    }

    @Scheduled(fixedRate = 25_000)
    public void latido() {
        emisoresPorViaje.forEach((idViaje, lista) -> {
            for (SseEmitter emisor : lista) {
                enviar(idViaje, emisor, SseEmitter.event().comment("latido"));
            }
        });
    }

    private void enviar(Long idViaje, SseEmitter emisor, SseEmitter.SseEventBuilder evento) {
        try {
            synchronized (emisor) {
                emisor.send(evento);
            }
        } catch (IOException | IllegalStateException e) {
            quitar(idViaje, emisor);
        }
    }

    private void quitar(Long idViaje, SseEmitter emisor) {
        List<SseEmitter> lista = emisoresPorViaje.get(idViaje);
        if (lista != null) {
            lista.remove(emisor);
            if (lista.isEmpty()) {
                emisoresPorViaje.remove(idViaje, lista);
            }
        }
        log.debug("SSE cerrado para viaje {}", idViaje);
    }
}