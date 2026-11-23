BEGIN;

ALTER TABLE public.transactions
ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX transactions_agent_idempotency_key
ON public.transactions (agent_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

COMMIT;