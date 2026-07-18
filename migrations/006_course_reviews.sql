-- 006_course_reviews.sql
-- Star ratings + written reviews per course. Run after 001.

create table if not exists course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  user_id uuid references auth.users(id) not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(course_id, user_id)
);
alter table course_reviews enable row level security;

drop policy if exists "Anyone can read reviews" on course_reviews;
create policy "Anyone can read reviews" on course_reviews for select using (true);

drop policy if exists "Users manage their own review" on course_reviews;
create policy "Users manage their own review" on course_reviews for all using (auth.uid() = user_id);
