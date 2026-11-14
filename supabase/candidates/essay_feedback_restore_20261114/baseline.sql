-- LegendStudy feedback operations — reviewed migration candidate.
-- Production apply is intentionally a separate Product Owner action.
-- No recipient, provider secret, admin email or client-controlled owner/status
-- field is stored in this migration.

begin;

create table public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default pg_catalog.now()
);

create table public.feedback_submissions (
    id uuid primary key default gen_random_uuid(),
    -- Omitted by the client: Supabase derives this from the JWT. Anonymous
    -- requests resolve to NULL and are allowed by the guest insert policy.
    user_id uuid default (auth.uid()) references auth.users(id) on delete set null,
    category text not null check (category in ('inquiry', 'bug', 'suggestion', 'other')),
    title text not null check (char_length(btrim(title)) between 1 and 120),
    body text not null check (char_length(btrim(body)) between 1 and 5000),
    app_version text not null check (char_length(btrim(app_version)) between 1 and 40),
    build_number text not null check (char_length(btrim(build_number)) between 1 and 40),
    platform text not null check (platform in ('ios', 'android', 'web', 'macos', 'windows', 'linux', 'fuchsia')),
    os_version text not null check (char_length(btrim(os_version)) between 1 and 160),
    locale text check (locale is null or char_length(btrim(locale)) between 1 and 20),
    status text not null default 'new' check (status in ('new', 'reviewing', 'resolved')),
    created_at timestamptz not null default pg_catalog.now(),
    updated_at timestamptz not null default pg_catalog.now()
);

create table public.feedback_notifications (
    id uuid primary key default gen_random_uuid(),
    feedback_id uuid not null references public.feedback_submissions(id) on delete cascade,
    channel text not null default 'email' check (channel = 'email'),
    status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
    attempt_count integer not null default 0 check (attempt_count between 0 and 8),
    last_error_code text check (last_error_code is null or char_length(last_error_code) between 1 and 80),
    created_at timestamptz not null default pg_catalog.now(),
    sent_at timestamptz,
    constraint feedback_notifications_sent_at_state check (
        (status = 'sent') = (sent_at is not null)
    ),
    unique (feedback_id, channel)
);

create function public.is_feedback_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.admin_users
        where user_id = (select auth.uid())
    );
$$;
revoke all on function public.is_feedback_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_feedback_admin() to authenticated;

create index feedback_submissions_created
    on public.feedback_submissions (created_at desc, id desc);
create index feedback_submissions_user_created
    on public.feedback_submissions (user_id, created_at desc, id desc);
create index feedback_notifications_pending
    on public.feedback_notifications (status, created_at)
    where status = 'pending';

create function public.feedback_updated_at() returns trigger
language plpgsql security invoker
set search_path = ''
as $$
begin
    new.updated_at = pg_catalog.now();
    return new;
end;
$$;
revoke all on function public.feedback_updated_at() from public, anon, authenticated, service_role;
create trigger feedback_submissions_updated_at
    before update on public.feedback_submissions
    for each row execute function public.feedback_updated_at();

create function public.enqueue_feedback_notification() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
    insert into public.feedback_notifications(feedback_id) values (new.id);
    return new;
end;
$$;
revoke all on function public.enqueue_feedback_notification() from public, anon, authenticated, service_role;
create trigger feedback_submissions_enqueue_email
    after insert on public.feedback_submissions
    for each row execute function public.enqueue_feedback_notification();

alter table public.admin_users enable row level security;
alter table public.feedback_submissions enable row level security;
alter table public.feedback_notifications enable row level security;

revoke all on table public.admin_users, public.feedback_submissions, public.feedback_notifications
    from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Client can submit only content/diagnostic columns. user_id, status and all
-- timestamps are server-controlled. Authenticated identity is the column
-- default, never a request payload.
grant insert (category, title, body, app_version, build_number, platform, os_version, locale)
    on public.feedback_submissions to anon, authenticated;
grant select on public.feedback_submissions to authenticated;

-- Admin Inbox uses RLS through authenticated requests. No client DELETE or
-- arbitrary-column UPDATE is part of v1.
grant update (status) on public.feedback_submissions to authenticated;

-- The future worker is trusted server code. It may read feedback content and
-- claim/update outbox rows, but it has no need to mutate admin membership.
grant select on public.feedback_submissions to service_role;
grant select, update on public.feedback_notifications to service_role;

create policy feedback_insert_guest on public.feedback_submissions
    for insert to anon
    with check (user_id is null and status = 'new');

create policy feedback_insert_owner on public.feedback_submissions
    for insert to authenticated
    with check ((select auth.uid()) = user_id and status = 'new');

create policy feedback_owner_select on public.feedback_submissions
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy feedback_admin_select on public.feedback_submissions
    for select to authenticated
    using (public.is_feedback_admin());

create policy feedback_admin_status on public.feedback_submissions
    for update to authenticated
    using (public.is_feedback_admin())
    with check (public.is_feedback_admin());

-- No policies or client grants exist for admin_users or feedback_notifications.
-- Owner registration is an out-of-band trusted operation after review.

notify pgrst, 'reload schema';
commit;

-- Worker contract (not deployed by B1): claim pending rows safely, send using
-- a server-side recipient/provider secret, then set sent_at/status. Use a
-- bounded attempt count and idempotency key (feedback_id, channel). Never
-- include tokens or full auth/profile metadata in logs or email.
