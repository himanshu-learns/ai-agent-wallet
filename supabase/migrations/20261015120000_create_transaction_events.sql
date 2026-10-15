create table public.transaction_events (
  id bigint generated always as identity primary key,
  transaction_id bigint not null
    references public.transactions(id),
  event_type text not null
    check (
      event_type in (
        'approval_failed',
        'approval_succeeded'
      )
    ),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.transaction_events
enable row level security;

revoke all on public.transaction_events
from anon, authenticated;