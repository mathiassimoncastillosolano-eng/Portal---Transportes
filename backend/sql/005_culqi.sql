BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'operacion_pago' AND column_name = 'mp_order_id') THEN
        ALTER TABLE public.operacion_pago RENAME COLUMN mp_order_id TO culqi_charge_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'operacion_pago' AND column_name = 'mp_estado') THEN
        ALTER TABLE public.operacion_pago RENAME COLUMN mp_estado TO culqi_estado;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'operacion_pago' AND column_name = 'mp_estado_detalle') THEN
        ALTER TABLE public.operacion_pago RENAME COLUMN mp_estado_detalle TO culqi_codigo;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'operacion_pago' AND column_name = 'mp_payment_id') THEN
        ALTER TABLE public.operacion_pago RENAME COLUMN mp_payment_id TO culqi_refund_id;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_operacion_pago_mp_order') THEN
        ALTER TABLE public.operacion_pago RENAME CONSTRAINT uq_operacion_pago_mp_order TO uq_operacion_pago_culqi_charge;
    END IF;
END $$;

ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS culqi_charge_id varchar(64);
ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS culqi_estado varchar(40);
ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS culqi_codigo varchar(60);
ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS culqi_refund_id varchar(64);
ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS email_pagador varchar(150);
ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS terminos_aceptados_en timestamp;
ALTER TABLE public.operacion_pago ADD COLUMN IF NOT EXISTS terminos_version varchar(20);
ALTER TABLE public.operacion_pago DROP COLUMN IF EXISTS url_desafio_3ds;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_operacion_pago_culqi_charge') THEN
        ALTER TABLE public.operacion_pago
            ADD CONSTRAINT uq_operacion_pago_culqi_charge UNIQUE (culqi_charge_id);
    END IF;
END $$;

UPDATE public.operacion_pago
   SET culqi_charge_id = NULL, culqi_estado = NULL, culqi_codigo = NULL, culqi_refund_id = NULL
 WHERE culqi_charge_id IS NOT NULL AND culqi_charge_id NOT LIKE 'chr\_%';
UPDATE public.operacion_pago
   SET culqi_estado = NULL, culqi_codigo = NULL, culqi_refund_id = NULL
 WHERE culqi_charge_id IS NULL;

UPDATE public.metodo_pago SET nombre_metodo = 'Culqi - Tarjeta'
 WHERE nombre_metodo = 'Mercado Pago - Tarjeta'
   AND NOT EXISTS (SELECT 1 FROM public.metodo_pago WHERE nombre_metodo = 'Culqi - Tarjeta');
UPDATE public.metodo_pago SET nombre_metodo = 'Culqi - Yape'
 WHERE nombre_metodo = 'Mercado Pago - Yape'
   AND NOT EXISTS (SELECT 1 FROM public.metodo_pago WHERE nombre_metodo = 'Culqi - Yape');

INSERT INTO public.metodo_pago (nombre_metodo, activo)
SELECT 'Culqi - Tarjeta', true
 WHERE NOT EXISTS (SELECT 1 FROM public.metodo_pago WHERE nombre_metodo = 'Culqi - Tarjeta');
INSERT INTO public.metodo_pago (nombre_metodo, activo)
SELECT 'Culqi - Yape', true
 WHERE NOT EXISTS (SELECT 1 FROM public.metodo_pago WHERE nombre_metodo = 'Culqi - Yape');

UPDATE public.metodo_pago SET activo = false
 WHERE nombre_metodo ILIKE 'Mercado Pago%';

COMMIT;
