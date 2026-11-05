BEGIN;

ALTER TABLE public.agents
ADD COLUMN user_id UUID
REFERENCES auth.users(id)
ON DELETE SET NULL;

CREATE INDEX idx_agents_user_id
ON public.agents(user_id);

COMMIT;
