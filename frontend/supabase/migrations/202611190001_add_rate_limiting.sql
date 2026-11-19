BEGIN;

CREATE TABLE public.rate_limit_buckets (
  user_id UUID PRIMARY KEY
    REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limit_buckets
ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 900
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit settings';
  END IF;

  INSERT INTO public.rate_limit_buckets (
    user_id,
    request_count,
    window_started_at
  )
  VALUES (p_user_id, 1, v_now)

  ON CONFLICT (user_id)
  DO UPDATE SET
    request_count = CASE
      WHEN public.rate_limit_buckets.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE public.rate_limit_buckets.request_count + 1
    END,
    window_started_at = CASE
      WHEN public.rate_limit_buckets.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      THEN v_now
      ELSE public.rate_limit_buckets.window_started_at
    END

  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(UUID, INTEGER, INTEGER)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(UUID, INTEGER, INTEGER)
TO service_role;

COMMIT;