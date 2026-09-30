-- Lets a staff member's bookings skip the pending-approval step and go
-- straight to "confirmed" the moment a customer books them.
--
-- Run this in the Supabase SQL editor.

alter table staff
  add column if not exists auto_confirm_bookings boolean not null default false;
