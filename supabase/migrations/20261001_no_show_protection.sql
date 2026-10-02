-- Stage 3 of payment integration: no-show protection.
--
-- A shop can turn on saving a customer's card (no charge) at booking time
-- as a no-show guard, then either charge a no-show fee straight to that
-- card — paid out to the staff member via their Stage 1 Connect account,
-- same as the real transaction would have been — or, if no card was taken,
-- just log that a fee is owed for the owner/staff to chase up manually.
--
-- Run this in the Supabase SQL editor.

alter table tenants
  add column if not exists no_show_protection_enabled boolean not null default false,
  add column if not exists no_show_card_required boolean not null default true,
  add column if not exists no_show_fee_mode text not null default 'flat' check (no_show_fee_mode in ('flat', 'percentage', 'per_service')),
  add column if not exists no_show_fee_flat numeric,
  add column if not exists no_show_fee_percentage numeric;

comment on column tenants.no_show_card_required is
  'When no-show protection is on: true means a customer cannot complete a booking without adding a card. false lets them skip it, in which case a no-show just goes to the manual fee-owed log instead of an automatic charge.';
comment on column tenants.no_show_fee_mode is
  'How the no-show fee amount is worked out: flat (tenants.no_show_fee_flat, a fixed £ amount for any booking), percentage (tenants.no_show_fee_percentage, % of that booking''s service price), or per_service (services.no_show_fee, set individually per service).';

alter table services
  add column if not exists no_show_fee numeric;

comment on column services.no_show_fee is
  'Only used when the tenant''s no_show_fee_mode is ''per_service''. Null means no no-show fee applies to this service.';

alter table bookings
  add column if not exists no_show boolean not null default false,
  add column if not exists no_show_fee_amount numeric,
  add column if not exists no_show_fee_status text not null default 'none' check (no_show_fee_status in ('none', 'logged', 'charged', 'failed', 'waived')),
  add column if not exists no_show_charged_at timestamptz,
  add column if not exists customer_stripe_customer_id text,
  add column if not exists customer_payment_method_id text;

comment on column bookings.no_show_fee_status is
  'none (default) | logged (no card on file / charge failed — fee owed, chased manually) | charged (collected via Stripe, paid out to the staff member) | failed (a charge attempt was declined) | waived (owner/staff decided not to charge after all).';
comment on column bookings.customer_payment_method_id is
  'Saved only when the tenant has no-show protection on and the customer added a card at booking time — never otherwise. This is what a "Charge no-show fee" action charges.';

-- Lets a staff member read the no-show fields for their own bookings in a
-- date range, alongside the pre-existing staff_get_my_bookings (left
-- untouched — its exact original definition isn't in this migrations
-- folder, so it's safer to add a new function than guess at replacing it).
-- The frontend calls both and merges by booking id.
create or replace function staff_get_no_show_fields(
  p_tenant_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  id uuid,
  no_show boolean,
  no_show_fee_amount numeric,
  no_show_fee_status text,
  has_card boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from staff
    where tenant_id = p_tenant_id and user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.id,
      b.no_show,
      b.no_show_fee_amount,
      b.no_show_fee_status,
      (b.customer_payment_method_id is not null) as has_card
    from bookings b
    join staff s on s.id = b.staff_id and s.tenant_id = p_tenant_id and s.user_id = auth.uid()
    where b.tenant_id = p_tenant_id
      and b.start_time >= p_start
      and b.start_time <= p_end;
end;
$$;

grant execute on function staff_get_no_show_fields(uuid, timestamptz, timestamptz) to authenticated;
