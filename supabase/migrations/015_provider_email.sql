alter table providers add column if not exists email text;
create index if not exists providers_email_idx on providers(email);
