-- Tracks whether the one-off "your trial ends soon" invoice has already been
-- raised/sent for a tenant, so app/api/cron/send-trial-invoices doesn't send
-- it again on every subsequent daily run during that tenant's last 7 days.
alter table tenants add column if not exists trial_invoice_sent_at timestamptz;
