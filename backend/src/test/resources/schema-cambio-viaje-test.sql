-- Solo para CambioViajeAgenciaIntegracionTest: el login empresarial lee el nombre de la sede del agente,
-- y la tabla agencia de schema-compras-test.sql no trae esa columna.
ALTER TABLE agencia ADD COLUMN IF NOT EXISTS nombre_agencia varchar(100);
