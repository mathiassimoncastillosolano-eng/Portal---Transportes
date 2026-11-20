-- Tablas adicionales para DashboardIntegracionTest (se suma a schema-test.sql y schema-reserva-test.sql).
-- A diferencia de schema-compras-test.sql, la agencia lleva su nombre porque el Dashboard lo muestra en los filtros.
CREATE TABLE IF NOT EXISTS agencia (
 id_agencia bigint PRIMARY KEY, id_ubicacion bigint NOT NULL, nombre_agencia varchar(100) NOT NULL,
 activa boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS ruta (
 id_ruta bigint PRIMARY KEY, id_agencia_origen bigint, id_agencia_destino bigint,
 duracion_estimada_min integer, activa boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS programacion_viaje (
 id_programacion bigint PRIMARY KEY, id_ruta bigint, activa boolean NOT NULL DEFAULT true
);
