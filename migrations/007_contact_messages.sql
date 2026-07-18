-- 007_contact_messages.sql
-- Stores submissions from the Contact page form.

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz default now()
);
alter table contact_messages enable row level security;

drop policy if exists "Anyone can submit a contact message" on contact_messages;
create policy "Anyone can submit a contact message" on contact_messages for insert with check (true);

-- Note: no select policy is added here on purpose — messages are write-only
-- from the public's perspective. Read them from the Supabase Table Editor
-- directly, or add an admin-only select policy later if you build an
-- in-app inbox view.
