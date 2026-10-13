-- Tablas adicionales para ComprasIntegracionTest (se suma a schema-test.sql y schema-reserva-test.sql, que
-- ya crean usuario, ubicacion, tipo_bus, bus, viaje, asiento, viaje_asiento, pasajero, venta, pago, pasaje y
-- operacion_pago). Solo columnas que usan las consultas de com.transportes.compras.
CREATE TABLE IF NOT EXISTS agencia (
 id_agencia bigint PRIMARY KEY, id_ubicacion bigint NOT NULL, activa boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS ruta (
 id_ruta bigint PRIMARY KEY, id_agencia_origen bigint, id_agencia_destino bigint,
 duracion_estimada_min integer, activa boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS programacion_viaje (
 id_programacion bigint PRIMARY KEY, id_ruta bigint, activa boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS comprobante (
 id_comprobante integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_venta integer NOT NULL REFERENCES venta(id_venta),
 serie varchar(10) NOT NULL, numero varchar(15) NOT NULL,
 fecha_emision timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 tipo_comprobante varchar(30) NOT NULL,
 CONSTRAINT uq_comprobante_venta UNIQUE (id_venta)
);
