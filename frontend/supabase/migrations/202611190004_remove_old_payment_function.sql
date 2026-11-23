BEGIN;

DROP FUNCTION public.process_payment_atomic(
  bigint,
  text,
  numeric,
  text,
  text
);

COMMIT;