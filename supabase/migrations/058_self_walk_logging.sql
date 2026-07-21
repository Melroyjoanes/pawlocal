-- 058: Dog-parent self-walk logging — a parent can log a walk with their own
-- dog themselves, without a walker connection. Additive only: every existing
-- row gets logged_by = 'walker' via the DEFAULT, so no existing query or
-- report changes meaning.

-- A self-walk has no walker_connections row at all, so connection_id must
-- be optional. No existing code path filters on connection_id IS NOT NULL
-- (verified against usage in app/), so this is safe to relax.
alter table walk_logs alter column connection_id drop not null;

alter table walk_logs add column if not exists logged_by text not null default 'walker'
  check (logged_by in ('walker', 'parent'));

alter table walk_reports add column if not exists logged_by text not null default 'walker'
  check (logged_by in ('walker', 'parent'));

comment on column walk_logs.logged_by is 'walker: logged by a connected walker via token link. parent: logged by the dog owner themselves.';
comment on column walk_reports.logged_by is 'walker: logged by a connected walker via token link. parent: logged by the dog owner themselves.';
