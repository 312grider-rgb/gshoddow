-- 005_notifications.sql
-- In-app notification bell (dashboard/teacher dashboard).

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  body text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table notifications enable row level security;

drop policy if exists "Users see their own notifications" on notifications;
create policy "Users see their own notifications" on notifications for all using (auth.uid() = user_id);
