-- 014_classes_ai_memory_messaging.sql

-- Public/Private live classes with a join code for private ones
alter table live_sessions add column if not exists is_public boolean default true;
alter table live_sessions add column if not exists join_code text;

-- AI Teacher's persistent memory of each student's level per subject.
-- Populated by "Test Your Level" in the AI Learning Hub, and read back
-- by the AI Teacher chat to personalize future conversations.
create table if not exists ai_learning_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  subject text not null,
  level text not null, -- 'Beginner', 'Intermediate', 'Advanced'
  notes text,
  updated_at timestamptz default now(),
  unique(user_id, subject)
);
alter table ai_learning_profile enable row level security;
drop policy if exists "Users manage their own AI learning profile" on ai_learning_profile;
create policy "Users manage their own AI learning profile" on ai_learning_profile
  for all using (auth.uid() = user_id);

-- Direct messaging between any two users (student <-> teacher, etc.)
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) not null,
  receiver_id uuid references auth.users(id) not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table direct_messages enable row level security;
drop policy if exists "Users see messages they sent or received" on direct_messages;
create policy "Users see messages they sent or received" on direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "Users can send messages" on direct_messages;
create policy "Users can send messages" on direct_messages
  for insert with check (auth.uid() = sender_id);
drop policy if exists "Users can mark their received messages read" on direct_messages;
create policy "Users can mark their received messages read" on direct_messages
  for update using (auth.uid() = receiver_id);
