-- Stage 1 of payment integration: lets each staff member connect their own
-- Stripe account so they can be paid out directly (rather than everything
-- settling through the owner). This migration only adds the columns that
-- track connection status — no money moves yet, and normal booking payment
-- is still collected in person exactly as before.
--
-- These columns are written only by trusted server code (the /api/staff/
-- stripe/* routes and the Stripe webhook), using the service-role client,
-- which bypasses RLS entirely. They are not exposed through any existing
-- RPC, so a staff member reads their own status via a new, narrowly-scoped
-- function rather than the pre-existing staff_get_my_data (whose exact
-- original definition isn't in this migrations folder, so it's safer not to
-- touch it).
--
-- Run this in the Supabase SQL editor.

alter table staff
  add column if not exists stripe_account_id text,
  add column if not exists stripe_connect_status text not null default 'not_connected',
  add column if not exists stripe_payouts_enabled boolean not null default false;

-- stripe_connect_status is one of: 'not_connected', 'pending', 'connected'.
comment on column staff.stripe_connect_status is
  'not_connected | pending (onboarding started, not finished) | connected (Stripe has enabled payouts)';

drop function if exists staff_get_my_connect_status(uuid);

create function staff_get_my_connect_status(p_tenant_id uuid)
returns table (
  stripe_connect_status text,
  stripe_payouts_enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select s.stripe_connect_status, s.stripe_payouts_enabled
    from staff s
    where s.tenant_id = p_tenant_id
      and s.user_id = auth.uid();

  if not found then
    raise exception 'Not authorized';
  end if;
end;
$$;

grant execute on function staff_get_my_connect_status(uuid) to authenticated;
