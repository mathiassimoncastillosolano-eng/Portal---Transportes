-- Migracion 001: soporte de inicio de sesion con Google.
-- Idempotente: se puede ejecutar mas de una vez sin error y sin tocar datos.
-- Ejecutar en el SQL Editor de Supabase ANTES de desplegar el backend nuevo
-- (el backend arranca con ddl-auto=validate y exige la columna google_id).

BEGIN;

-- 1) Las cuentas creadas con Google no tienen contrasena propia.
--    (DROP NOT NULL no falla si la columna ya admite nulos.)
ALTER TABLE public.usuario
    ALTER COLUMN contrasena_hash DROP NOT NULL;

-- 2) Identificador estable de Google ("sub"). Admite NULL.
ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

-- 3) Cada cuenta de Google solo puede estar asociada a un usuario.
--    En PostgreSQL varios NULL no violan UNIQUE.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_usuario_google_id'
          AND conrelid = 'public.usuario'::regclass
    ) THEN
        ALTER TABLE public.usuario
            ADD CONSTRAINT uq_usuario_google_id UNIQUE (google_id);
    END IF;
END
$$;

COMMIT;
