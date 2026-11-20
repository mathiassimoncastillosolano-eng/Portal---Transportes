BEGIN;

ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS id_pasaje integer;
ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS id_asiento_nuevo integer;

COMMIT;
