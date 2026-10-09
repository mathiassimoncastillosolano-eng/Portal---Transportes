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
