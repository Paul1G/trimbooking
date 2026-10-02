-- Lets an admin give a shop free/comped access: exempt from trial expiry
-- (check-trials), the trial-ending invoice (send-trial-invoices), and
-- monthly billing (send-invoices), without pretending they're a paying
-- customer (`paid` stays false, so admin's "Paid" badge isn't misleading).
alter table tenants add column if not exists comped boolean not null default false;
