
BEGIN;

CREATE OR REPLACE FUNCTION public.process_payment_atomic(
  p_agent_id bigint,
  p_merchant text,
  p_amount numeric,
  p_status text,
  p_reason text,
  p_idempotency_key text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_agent public.agents%rowtype;
  v_transaction public.transactions%rowtype;
  v_existing public.transactions%rowtype;
  v_status text := p_status;
  v_reason text := p_reason;
BEGIN
  -- Validate payment details and idempotency key.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'Payment amount must be greater than zero'
    );
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('Approved', 'Blocked', 'Pending') THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'Invalid payment status'
    );
  END IF;

  IF p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) = 0
     OR length(p_idempotency_key) > 200 THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'Invalid idempotency key'
    );
  END IF;

  -- Lock the agent so concurrent requests serialize.
  SELECT *
  INTO v_agent
  FROM public.agents
  WHERE id = p_agent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'Agent not found'
    );
  END IF;

  -- Check whether this payment was already processed.
  SELECT *
  INTO v_existing
  FROM public.transactions
  WHERE agent_id = p_agent_id
    AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.merchant IS DISTINCT FROM p_merchant
       OR v_existing.amount IS DISTINCT FROM p_amount THEN
      RETURN json_build_object(
        'success', false,
        'reason', 'Idempotency key reused with different payment details'
      );
    END IF;

    RETURN json_build_object(
      'success', true,
      'duplicate', true,
      'transaction', json_build_object(
        'id', v_existing.id,
        'agentId', v_existing.agent_id,
        'merchant', v_existing.merchant,
        'amount', v_existing.amount,
        'status', v_existing.status,
        'reason', v_existing.reason,
        'createdAt', v_existing.created_at
      )
    );
  END IF;

  -- Recheck payment rules using the locked agent record.
  IF v_status = 'Approved' THEN
    IF NOT v_agent.active THEN
      v_status := 'Blocked';
      v_reason := 'Agent is paused';

    ELSIF NOT coalesce(
      p_merchant = ANY(v_agent.allowed_merchants),
      false
    ) THEN
      v_status := 'Blocked';
      v_reason := 'Merchant is not allowed';

    ELSIF p_amount > v_agent.balance THEN
      v_status := 'Blocked';
      v_reason := 'Insufficient wallet balance';

    ELSIF p_amount > v_agent.transaction_limit THEN
      v_status := 'Pending';
      v_reason := 'Payment exceeds transaction limit';

    ELSIF coalesce(v_agent.spent_today, 0) + p_amount
      > v_agent.daily_limit THEN
      v_status := 'Blocked';
      v_reason := 'Payment exceeds daily spending limit';
    END IF;
  END IF;

  -- Debit only approved payments.
  IF v_status = 'Approved' THEN
    UPDATE public.agents
    SET
      balance = balance - p_amount,
      spent_today = coalesce(spent_today, 0) + p_amount
    WHERE id = v_agent.id;
  END IF;

  -- Store the key with the transaction.
  INSERT INTO public.transactions (
    agent_id,
    merchant,
    amount,
    status,
    reason,
    idempotency_key
  )
  VALUES (
    p_agent_id,
    p_merchant,
    p_amount,
    v_status,
    v_reason,
    p_idempotency_key
  )
  RETURNING * INTO v_transaction;

  RETURN json_build_object(
    'success', true,
    'duplicate', false,
    'transaction', json_build_object(
      'id', v_transaction.id,
      'agentId', v_transaction.agent_id,
      'merchant', v_transaction.merchant,
      'amount', v_transaction.amount,
      'status', v_transaction.status,
      'reason', v_transaction.reason,
      'createdAt', v_transaction.created_at
    )
  );
END;
$function$;

-- Only the server's service role can execute this function.
REVOKE ALL ON FUNCTION public.process_payment_atomic(
  bigint, text, numeric, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_payment_atomic(
  bigint, text, numeric, text, text, text
) TO service_role;

COMMIT;
