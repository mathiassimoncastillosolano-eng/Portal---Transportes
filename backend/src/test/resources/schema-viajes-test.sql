CREATE TABLE agencia(id_agencia bigint PRIMARY KEY, id_ubicacion bigint NOT NULL REFERENCES ubicacion(id_ubicacion), activa boolean NOT NULL);
CREATE TABLE ruta(id_ruta bigint PRIMARY KEY, id_agencia_origen bigint REFERENCES agencia(id_agencia), id_agencia_destino bigint REFERENCES agencia(id_agencia), duracion_estimada_min integer, activa boolean NOT NULL);
CREATE TABLE programacion_viaje(id_programacion bigint PRIMARY KEY, id_ruta bigint REFERENCES ruta(id_ruta), activa boolean NOT NULL);
CREATE TABLE bus(id_bus integer PRIMARY KEY, id_tipo_bus integer REFERENCES tipo_bus(id_tipo_bus), activo boolean NOT NULL);
CREATE TABLE viaje(id_viaje bigint PRIMARY KEY, id_programacion bigint REFERENCES programacion_viaje(id_programacion), id_bus bigint REFERENCES bus(id_bus), fecha_salida date NOT NULL, hora_salida time NOT NULL, estado_viaje varchar(30) NOT NULL);
CREATE TABLE viaje_asiento(id_viaje_asiento integer PRIMARY KEY, id_viaje integer REFERENCES viaje(id_viaje), precio numeric(10,2) NOT NULL, estado_viaje_asiento varchar(30) NOT NULL);
CREATE TABLE servicio_bus(id_servicio_bus integer PRIMARY KEY, nombre_servicio varchar(50) NOT NULL);
CREATE TABLE tipo_bus_servicio(id_tipo_bus integer REFERENCES tipo_bus(id_tipo_bus), id_servicio_bus integer REFERENCES servicio_bus(id_servicio_bus), PRIMARY KEY(id_tipo_bus,id_servicio_bus));
