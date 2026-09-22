-- =====================================================================
-- Datos mínimos para probar GET /api/viajes/tipo-servicio
-- Crea: 2 ubicaciones, 2 agencias, 1 ruta, los 5 tipo_bus, 5 buses,
-- 5 programaciones (una por tipo) y 5 viajes (uno por programación).
-- Pensado para ejecutarse una sola vez sobre una BD con las tablas ya
-- creadas (ver CREATE TABLE provistos). Usa ON CONFLICT para que se
-- pueda re-ejecutar sin duplicar los tipo_bus si ya existen.
-- =====================================================================

BEGIN;

-- 1) Ubicaciones mínimas -------------------------------------------------
WITH ubi_lima AS (
    INSERT INTO ubicacion (nombre, distrito, provincia, departamento, activa)
    VALUES ('Terminal Lima Norte', 'Independencia', 'Lima', 'Lima', TRUE)
    RETURNING id_ubicacion
),
ubi_cusco AS (
    INSERT INTO ubicacion (nombre, distrito, provincia, departamento, activa)
    VALUES ('Terminal Cusco Centro', 'Wanchaq', 'Cusco', 'Cusco', TRUE)
    RETURNING id_ubicacion
),

-- 2) Agencias --------------------------------------------------------------
agencia_origen AS (
    INSERT INTO agencia (nombre_agencia, direccion, telefono, id_ubicacion, activa)
    SELECT 'Agencia Lima Norte', 'Av. Túpac Amaru 1500', '014000000', id_ubicacion, TRUE
    FROM ubi_lima
    RETURNING id_agencia
),
agencia_destino AS (
    INSERT INTO agencia (nombre_agencia, direccion, telefono, id_ubicacion, activa)
    SELECT 'Agencia Cusco Centro', 'Av. El Sol 800', '084000000', id_ubicacion, TRUE
    FROM ubi_cusco
    RETURNING id_agencia
),

-- 3) Ruta Lima -> Cusco ------------------------------------------------------
ruta_nueva AS (
    INSERT INTO ruta (id_agencia_origen, id_agencia_destino, distancia_km, duracion_estimada_min, activa)
    SELECT agencia_origen.id_agencia, agencia_destino.id_agencia, 1105.00, 1260, TRUE
    FROM agencia_origen, agencia_destino
    RETURNING id_ruta
)

SELECT id_ruta FROM ruta_nueva;

-- 4) Los cinco tipo_bus (idempotente: no falla si ya existen) --------------
INSERT INTO tipo_bus (nombre_tipo, descripcion)
VALUES
    ('Semi Cama', 'Asiento reclinable 140°, ideal para rutas de media distancia'),
    ('Prime', 'Espacios amplios y atención preferente'),
    ('Económico', 'Alternativa accesible, asiento reclinable 100°'),
    ('Ultra', 'Experiencia premium con cabina semi privada'),
    ('Bus Cama', 'Reclinado 160°, manta y almohada')
ON CONFLICT (nombre_tipo) DO NOTHING;

COMMIT;

-- =====================================================================
-- 5) Bus + programación + viaje para CADA tipo de servicio
-- Se hace en un segundo bloque porque necesita los id_ruta / id_tipo_bus
-- ya existentes (creados arriba o previamente en la BD).
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_id_ruta      INTEGER;
    v_id_tipo_bus  INTEGER;
    v_id_bus       INTEGER;
    v_id_prog      INTEGER;
    v_nombre_tipo  TEXT;
    v_placa_base   TEXT;
BEGIN
    -- Toma la última ruta creada (Lima -> Cusco). Si ya tenías rutas
    -- propias, cambia esta subconsulta por el id_ruta que corresponda.
    SELECT id_ruta INTO v_id_ruta FROM ruta ORDER BY id_ruta DESC LIMIT 1;

    FOR v_nombre_tipo, v_placa_base IN
        SELECT * FROM (VALUES
            ('Semi Cama', 'SEM-001'),
            ('Prime',      'PRI-001'),
            ('Económico',  'ECO-001'),
            ('Ultra',      'ULT-001'),
            ('Bus Cama',   'CAM-001')
        ) AS t(nombre_tipo, placa_base)
    LOOP
        SELECT id_tipo_bus INTO v_id_tipo_bus FROM tipo_bus WHERE nombre_tipo = v_nombre_tipo;

        -- Bus de ese tipo (evita duplicar si ya se corrió antes)
        SELECT id_bus INTO v_id_bus FROM bus WHERE placa = v_placa_base;
        IF v_id_bus IS NULL THEN
            INSERT INTO bus (id_tipo_bus, placa, numero_interno, capacidad_asientos, activo)
            VALUES (v_id_tipo_bus, v_placa_base, v_placa_base, 40, TRUE)
            RETURNING id_bus INTO v_id_bus;
        END IF;

        -- Programación (ruta + tipo_bus + hora de salida)
        INSERT INTO programacion_viaje (id_ruta, id_tipo_bus, hora_salida, activa)
        VALUES (v_id_ruta, v_id_tipo_bus, '20:00:00', TRUE)
        RETURNING id_programacion INTO v_id_prog;

        -- Viaje concreto para mañana
        INSERT INTO viaje (id_programacion, id_bus, estado_viaje, fecha_salida, hora_salida)
        VALUES (v_id_prog, v_id_bus, 'PROGRAMADO', CURRENT_DATE + 1, '20:00:00');
    END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- 6) Servicios (amenidades) por tipo de bus — FASE 1
-- servicio_bus + tipo_bus_servicio, para que las tarjetas muestren
-- WiFi/Baño/TV/etc. dinámicamente (tipo_bus -> tipo_bus_servicio ->
-- servicio_bus). Los nombres deben coincidir tal cual con las claves
-- que el frontend sabe dibujar con ícono (WiFi, Baño, TV, Snack, USB,
-- Cabina privada); cualquier otro nombre igual se muestra, solo que
-- sin ícono propio.
-- =====================================================================

BEGIN;

INSERT INTO servicio_bus (nombre_servicio, icono)
VALUES
    ('WiFi', 'wifi'),
    ('Baño', 'bano'),
    ('TV', 'tv'),
    ('Snack', 'snack'),
    ('USB', 'usb'),
    ('Cabina privada', 'cabina')
ON CONFLICT (nombre_servicio) DO NOTHING;

-- Asignación por tipo (igual de generosa que el mock anterior del
-- frontend, para que la comparación visual "antes/después" sea directa)
DO $$
DECLARE
    v_id_tipo_bus INTEGER;
    v_id_servicio INTEGER;
    v_nombre_tipo TEXT;
    v_nombre_servicio TEXT;
BEGIN
    FOR v_nombre_tipo, v_nombre_servicio IN
        SELECT * FROM (VALUES
            ('Económico',  'WiFi'),
            ('Económico',  'Baño'),
            ('Semi Cama',  'WiFi'),
            ('Semi Cama',  'Baño'),
            ('Semi Cama',  'TV'),
            ('Bus Cama',   'WiFi'),
            ('Bus Cama',   'Baño'),
            ('Bus Cama',   'TV'),
            ('Bus Cama',   'Snack'),
            ('Prime',      'WiFi'),
            ('Prime',      'Baño'),
            ('Prime',      'TV'),
            ('Prime',      'Snack'),
            ('Prime',      'USB'),
            ('Ultra',      'WiFi'),
            ('Ultra',      'Baño'),
            ('Ultra',      'TV'),
            ('Ultra',      'Snack'),
            ('Ultra',      'USB'),
            ('Ultra',      'Cabina privada')
        ) AS t(nombre_tipo, nombre_servicio)
    LOOP
        SELECT id_tipo_bus INTO v_id_tipo_bus FROM tipo_bus WHERE nombre_tipo = v_nombre_tipo;
        SELECT id_servicio_bus INTO v_id_servicio FROM servicio_bus WHERE nombre_servicio = v_nombre_servicio;

        INSERT INTO tipo_bus_servicio (id_tipo_bus, id_servicio_bus)
        VALUES (v_id_tipo_bus, v_id_servicio)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- Verificación rápida (opcional, no forma parte del insert):
-- SELECT v.id_viaje, tb.nombre_tipo, v.estado_viaje, v.fecha_salida
-- FROM viaje v
-- JOIN programacion_viaje pv ON pv.id_programacion = v.id_programacion
-- JOIN tipo_bus tb ON tb.id_tipo_bus = pv.id_tipo_bus
-- ORDER BY tb.nombre_tipo;
-- =====================================================================
