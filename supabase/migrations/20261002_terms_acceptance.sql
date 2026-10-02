-- Records when a shop owner accepted TrimBooking's Terms of Service and
-- Privacy Policy at signup, so acceptance has an actual timestamp on file
-- rather than relying on a link having once been in the page's footer.
alter table tenants add column if not exists terms_accepted_at timestamptz;
