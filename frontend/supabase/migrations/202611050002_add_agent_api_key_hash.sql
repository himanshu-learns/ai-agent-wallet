
BEGIN;

ALTER TABLE public.agents
ADD COLUMN api_key_hash TEXT;

ALTER TABLE public.agents
ALTER COLUMN api_key DROP NOT NULL;

CREATE UNIQUE INDEX agents_api_key_hash_key
ON public.agents(api_key_hash)
WHERE api_key_hash IS NOT NULL;

COMMIT;
