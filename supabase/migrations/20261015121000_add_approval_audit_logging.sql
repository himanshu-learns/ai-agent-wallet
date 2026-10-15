
create or replace function public.approve_transaction_atomic(
  p_transaction_id bigint
)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_transaction public.transactions%rowtype;
  v_agent public.agents%rowtype;
  v_reason text;
begin
  select *
  into v_transaction
  from public.transactions
  where id = p_transaction_id
    and status = 'Pending'
  for update;

  if not found then
    return json_build_object(
      'success', false,
      'reason', 'Transaction is not pending or does not exist'
    );
  end if;

  select *
  into v_agent
  from public.agents
  where id = v_transaction.agent_id
  for update;

  if not found then
    v_reason := 'Agent not found';
  elsif not v_agent.active then
    v_reason := 'Agent is inactive';
  elsif not coalesce(
    v_transaction.merchant = any(v_agent.allowed_merchants),
    false
  ) then
    v_reason := 'Merchant is no longer allowed';
  elsif v_transaction.amount > v_agent.balance then
    v_reason := 'Insufficient wallet balance';
  elsif coalesce(v_agent.spent_today, 0)
        + v_transaction.amount > v_agent.daily_limit then
    v_reason := 'Payment would exceed daily spending limit';
  end if;

  if v_reason is not null then
    insert into public.transaction_events (
      transaction_id,
      event_type,
      reason
    )
    values (
      v_transaction.id,
      'approval_failed',
      v_reason
    );

    return json_build_object(
      'success', false,
      'reason', v_reason
    );
  end if;

  update public.agents
  set
    balance = balance - v_transaction.amount,
    spent_today = coalesce(spent_today, 0) + v_transaction.amount
  where id = v_agent.id;

  update public.transactions
  set
    status = 'Approved',
    reason = 'Payment approved by user'
  where id = v_transaction.id;

  insert into public.transaction_events (
    transaction_id,
    event_type,
    reason
  )
  values (
    v_transaction.id,
    'approval_succeeded',
    'Payment approved by user'
  );

  return json_build_object(
    'success', true,
    'transactionId', v_transaction.id,
    'agentId', v_agent.id,
    'amount', v_transaction.amount
  );
end;
$function$;
