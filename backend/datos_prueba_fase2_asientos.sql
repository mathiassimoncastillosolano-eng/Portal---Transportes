-- =====================================================================
-- FASE 2 — Datos mínimos para probar disponibilidad real de asientos
--
-- Requiere haber corrido antes los scripts de la Fase 0/1
-- (datos_prueba_tipo_servicio.sql / datos_prueba_fase1.sql), que ya
-- crearon los 5 buses de prueba (SEM-001, PRI-001, ECO-001, ULT-001,
-- CAM-001) con 1 viaje cada uno.
--
-- Este script:
--   1) Genera 40 asientos por bus (capacidad_asientos de esos buses).
--   2) Genera viaje_asiento para el viaje de cada bus, con distintos
--      estados/precios para poder ver los 3 casos pedidos:
--        - SEM-001 -> 20 disponibles  ("20 asientos disponibles")
--        - PRI-001 ->  8 disponibles  ("Últimos 8 asientos")
--        - ECO-001 ->  0 disponibles  ("Agotado")
--        - ULT-001 -> 40 disponibles  ("40 asientos disponibles")
--        - CAM-001 -> 35 disponibles + 5 ANULADO (para probar que
--          "anulado" no cuenta ni como disponible ni como ocupado)
--
-- IMPORTANTE (revisar contra la BD real): este script asume que el
-- estado de un asiento disponible se guarda como el texto
-- 'DISPONIBLE' (en mayúsculas). Los estados 'OCUPADO' y 'ANULADO' se
-- usan solo para tener datos de prueba variados; si en producción se
-- usan otros textos, avísenme para ajustar la única constante que los
-- usa (ViajeAsientoRepository.resumenPorViajes).
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_placa        TEXT;
    v_id_bus       INTEGER;
    v_id_viaje     INTEGER;
    v_precio       NUMERIC(10,2);
    v_disponibles  INTEGER;
    v_anulados     INTEGER;
    i              INTEGER;
    v_id_asiento   INTEGER;
    v_estado       TEXT;
BEGIN
    FOR v_placa, v_precio, v_disponibles, v_anulados IN
        SELECT * FROM (VALUES
            ('SEM-001', 60.00::numeric, 20, 0),
            ('PRI-001', 90.00::numeric,  8, 0),
            ('ECO-001', 40.00::numeric,  0, 0),
            ('ULT-001', 120.00::numeric, 40, 0),
            ('CAM-001', 80.00::numeric, 35, 5)
        ) AS t(placa, precio, disponibles, anulados)
    LOOP
        SELECT id_bus INTO v_id_bus FROM bus WHERE placa = v_placa;
        SELECT v.id_viaje INTO v_id_viaje
        FROM viaje v
        WHERE v.id_bus = v_id_bus
        ORDER BY v.id_viaje DESC
        LIMIT 1;

        IF v_id_bus IS NULL OR v_id_viaje IS NULL THEN
            RAISE NOTICE 'Bus % o su viaje no existen todavía (¿corriste el script de la Fase 0/1?), se omite.', v_placa;
            CONTINUE;
        END IF;

        FOR i IN 1..40 LOOP
            -- Asiento (si ya existe, se reutiliza en vez de duplicar)
            SELECT id_asiento INTO v_id_asiento
            FROM asiento WHERE id_bus = v_id_bus AND numero_asiento = i::text;

            IF v_id_asiento IS NULL THEN
                INSERT INTO asiento (id_bus, numero_asiento, piso)
                VALUES (v_id_bus, i::text, 1)
                RETURNING id_asiento INTO v_id_asiento;
            END IF;

            -- Estado de este asiento para ESTE viaje: primero los
            -- disponibles, luego los anulados, el resto ocupados.
            IF i <= v_disponibles THEN
                v_estado := 'DISPONIBLE';
            ELSIF i <= v_disponibles + v_anulados THEN
                v_estado := 'ANULADO';
            ELSE
                v_estado := 'OCUPADO';
            END IF;

            INSERT INTO viaje_asiento (id_viaje, id_asiento, estado_viaje_asiento, precio)
            VALUES (v_id_viaje, v_id_asiento, v_estado, v_precio)
            ON CONFLICT (id_viaje, id_asiento) DO UPDATE
                SET estado_viaje_asiento = EXCLUDED.estado_viaje_asiento,
                    precio = EXCLUDED.precio;
        END LOOP;
    END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- Verificación rápida (opcional):
-- SELECT b.placa, tb.nombre_tipo,
--        COUNT(*) FILTER (WHERE va.estado_viaje_asiento = 'DISPONIBLE') AS disponibles,
--        COUNT(*) AS total
-- FROM viaje_asiento va
-- JOIN viaje v ON v.id_viaje = va.id_viaje
-- JOIN bus b ON b.id_bus = v.id_bus
-- JOIN programacion_viaje pv ON pv.id_programacion = v.id_programacion
-- JOIN tipo_bus tb ON tb.id_tipo_bus = pv.id_tipo_bus
-- GROUP BY b.placa, tb.nombre_tipo;
-- =====================================================================
