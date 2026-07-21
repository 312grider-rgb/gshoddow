-- 016_chess_games.sql
-- Backs online multiplayer Chess (skillstream-chess.html). Ludo needs no
-- table since it's AI/local-pass-and-play only for now.

create table if not exists chess_games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  fen text not null,
  white_player uuid references auth.users(id) not null,
  black_player uuid references auth.users(id),
  status text not null default 'waiting', -- 'waiting', 'active', 'finished'
  created_at timestamptz default now()
);
alter table chess_games enable row level security;

drop policy if exists "Anyone can view chess games" on chess_games;
create policy "Anyone can view chess games" on chess_games for select using (true);

drop policy if exists "Players can create games" on chess_games;
create policy "Players can create games" on chess_games for insert with check (auth.uid() = white_player);

drop policy if exists "Players can update their own games" on chess_games;
create policy "Players can update their own games" on chess_games for update
  using (auth.uid() = white_player or auth.uid() = black_player);

-- Enable Realtime so moves sync live between the two players. In
-- Supabase: Database -> Replication -> toggle "chess_games" on, or run:
alter publication supabase_realtime add table chess_games;
