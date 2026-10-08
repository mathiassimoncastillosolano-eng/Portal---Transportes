-- Migracion 002: recuperacion de contrasena por correo.
-- Idempotente y NO destructiva: no elimina ni modifica tablas ni filas existentes.
-- Ejecutar en el SQL Editor de Supabase ANTES de desplegar el backend nuevo
-- (el backend arranca con ddl-auto=validate y exige estas columnas).
--
-- Si la tabla password_reset_tokens ya existe (con la definicion original), esta
-- migracion solo le anade dos columnas y asegura los indices y la seguridad.

BEGIN;

-- 1) Tabla (solo se crea si no existe). Definicion original + columnas nuevas.
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    id_usuario          INTEGER NOT NULL
                            REFERENCES public.usuario(id_usuario)
                            ON DELETE CASCADE,
    token_hash          VARCHAR(64) NOT NULL UNIQUE,
    fecha_expiracion    TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    fecha_uso           TIMESTAMP WITHOUT TIME ZONE,
    fecha_creacion      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2) Columnas nuevas (si la tabla ya existia sin ellas).
--    intentos: intentos fallidos de verificar el codigo de este desafio.
--    fecha_verificacion: cuando se acerto el codigo (habilita el cambio de contrasena por tiempo limitado).
ALTER TABLE public.password_reset_tokens
    ADD COLUMN IF NOT EXISTS intentos INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.password_reset_tokens
    ADD COLUMN IF NOT EXISTS fecha_verificacion TIMESTAMP WITHOUT TIME ZONE;

-- 3) Indices (los dos originales, por si faltaran).
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_usuario
    ON public.password_reset_tokens(id_usuario);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiracion
    ON public.password_reset_tokens(fecha_expiracion);

-- 4) Seguridad en Supabase: la tabla guarda hashes de codigos y no debe ser accesible
--    desde la API de datos (PostgREST) con las claves anon/authenticated.
--    El backend se conecta con el rol postgres (que omite RLS), asi que sigue funcionando.
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON TABLE public.password_reset_tokens FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON TABLE public.password_reset_tokens FROM authenticated';
    END IF;
END
$$;

COMMIT;

-- Verificacion sugerida (solo lectura):
--   SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' ORDER BY ordinal_position;
