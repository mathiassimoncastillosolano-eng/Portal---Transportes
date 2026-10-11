-- Esquema propio de PagoReservaIntegracionTest (se suma a schema-test.sql sin modificarlo).
-- Tablas de reserva que mapean entidades JPA; hibernate validate las exige.
CREATE TABLE IF NOT EXISTS bus (
 id_bus integer PRIMARY KEY, id_tipo_bus integer, activo boolean NOT NULL,
 placa varchar(10) DEFAULT 'TST-000', numero_interno varchar(20) DEFAULT '0',
 capacidad_asientos smallint DEFAULT 40, fecha_creacion timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS viaje (
 id_viaje bigint PRIMARY KEY, id_programacion bigint, id_bus bigint,
 fecha_salida date NOT NULL, hora_salida time NOT NULL, estado_viaje varchar(30) NOT NULL,
 fecha_creacion timestamp DEFAULT CURRENT_TIMESTAMP, fecha_actualizacion timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS asiento (
 id_asiento integer PRIMARY KEY, id_bus integer, numero_asiento varchar(5) NOT NULL,
 piso smallint NOT NULL DEFAULT 1, fecha_creacion timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS viaje_asiento (
 id_viaje_asiento integer PRIMARY KEY, id_viaje integer, precio numeric(10,2) NOT NULL,
 estado_viaje_asiento varchar(30) NOT NULL, id_asiento integer,
 fecha_creacion timestamp DEFAULT CURRENT_TIMESTAMP, fecha_actualizacion timestamp DEFAULT CURRENT_TIMESTAMP,
 fecha_expiracion_bloqueo timestamp, token_bloqueo varchar(100), id_pasajero integer
);
CREATE TABLE IF NOT EXISTS pasajero (
 id_pasajero integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tipo_documento varchar(10) NOT NULL, numero_documento varchar(20) NOT NULL,
 nombres varchar(100) NOT NULL, apellidos varchar(100) NOT NULL, fecha_nacimiento date,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, nro_telefono varchar(20)
);
-- Funciones de PostgreSQL que usa ViajeAsientoRepositorio.bloquearSesion; H2 no las trae.
CREATE ALIAS IF NOT EXISTS hashtext FOR "com.transportes.viajes.FuncionesPostgresH2.hashtext";
CREATE ALIAS IF NOT EXISTS pg_advisory_xact_lock FOR "com.transportes.viajes.FuncionesPostgresH2.pgAdvisoryXactLock";
-- Tablas de compra (esquema real en Supabase) y operacion_pago (migración 003_pagos_mercadopago.sql).
CREATE TABLE IF NOT EXISTS metodo_pago (
 id_metodo_pago integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre_metodo varchar(50) NOT NULL UNIQUE, activo boolean NOT NULL DEFAULT true,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS venta (
 id_venta integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_usuario integer REFERENCES usuario(id_usuario),
 fecha_venta timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 monto_total numeric(10,2) NOT NULL CHECK (monto_total >= 0),
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 estado_venta varchar(30) NOT NULL
);
CREATE TABLE IF NOT EXISTS pago (
 id_pago integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_venta integer NOT NULL REFERENCES venta(id_venta),
 id_metodo_pago integer NOT NULL REFERENCES metodo_pago(id_metodo_pago),
 monto numeric(10,2) NOT NULL CHECK (monto > 0),
 fecha_pago timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 estado_pago varchar(30) NOT NULL,
 CONSTRAINT uq_pago_venta UNIQUE (id_venta)
);
CREATE TABLE IF NOT EXISTS pasaje (
 id_pasaje integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_venta integer NOT NULL REFERENCES venta(id_venta),
 id_pasajero integer NOT NULL REFERENCES pasajero(id_pasajero),
 id_viaje_asiento integer NOT NULL REFERENCES viaje_asiento(id_viaje_asiento),
 precio numeric(10,2) NOT NULL CHECK (precio >= 0),
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_pasaje_viaje_asiento UNIQUE (id_viaje_asiento)
);
CREATE TABLE IF NOT EXISTS operacion_pago (
 id_operacion_pago integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 referencia_externa varchar(64) NOT NULL, clave_idempotencia varchar(64) NOT NULL,
 id_viaje bigint NOT NULL REFERENCES viaje(id_viaje), id_sesion_reserva varchar(100) NOT NULL,
 id_usuario integer NOT NULL REFERENCES usuario(id_usuario), medio_pago varchar(20) NOT NULL,
 monto numeric(10,2) NOT NULL, moneda varchar(3) NOT NULL DEFAULT 'PEN', estado varchar(30) NOT NULL,
 mp_order_id varchar(64), mp_estado varchar(40), mp_estado_detalle varchar(60), mp_payment_id varchar(64),
 url_desafio_3ds varchar(500), datos_pasajeros varchar(20000), id_venta integer REFERENCES venta(id_venta),
 mensaje varchar(255), fecha_expiracion timestamp NOT NULL, fecha_ultima_consulta timestamp,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_actualizacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_operacion_pago_referencia UNIQUE (referencia_externa),
 CONSTRAINT uq_operacion_pago_idempotencia UNIQUE (clave_idempotencia),
 CONSTRAINT uq_operacion_pago_mp_order UNIQUE (mp_order_id),
 CONSTRAINT uq_operacion_pago_venta UNIQUE (id_venta),
 CONSTRAINT ck_operacion_pago_monto CHECK (monto > 0)
);
