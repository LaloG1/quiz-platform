-- ============================================================
-- Esquema de base de datos — Plataforma tipo Kahoot
-- Supabase PostgreSQL
-- ============================================================

-- Perfiles de usuario (extiende auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar text not null default '🐱',
  created_at timestamptz not null default now()
);

-- Tests creados por un usuario
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Preguntas de un test
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question text not null,
  time_limit_seconds int not null default 20,
  order_index int not null
);

-- Respuestas de una pregunta
create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  color text not null default 'red' -- red | blue | yellow | green
);

-- Partidas concretas de un quiz (código ABC123)
create table games (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  code text unique not null,
  status text not null default 'waiting', -- waiting | playing | finished
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Jugadores conectados a una partida
create table game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  nickname text not null,
  avatar text not null,
  joined_at timestamptz not null default now()
);

-- Respuestas dadas por cada jugador en cada pregunta
create table game_answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references game_players(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer_id uuid not null references answers(id) on delete cascade,
  time_ms int not null,
  points int not null default 0,
  answered_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table games enable row level security;
alter table game_players enable row level security;
alter table game_answers enable row level security;

-- Perfiles: cualquiera puede leer, solo el dueño edita
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Quizzes: el dueño gestiona los suyos, lectura pública opcional
create policy "quizzes_owner_all" on quizzes for all using (auth.uid() = owner_id);

-- Preguntas y respuestas: heredan el permiso vía el quiz
create policy "questions_owner_all" on questions for all
  using (exists (select 1 from quizzes q where q.id = quiz_id and q.owner_id = auth.uid()));

create policy "answers_owner_all" on answers for all
  using (exists (
    select 1 from questions q
    join quizzes z on z.id = q.quiz_id
    where q.id = question_id and z.owner_id = auth.uid()
  ));

-- Games: el dueño del quiz gestiona la partida, cualquiera puede leer el estado (para unirse)
create policy "games_select_public" on games for select using (true);
create policy "games_owner_write" on games for insert with check (
  exists (select 1 from quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
);
create policy "games_owner_update" on games for update using (
  exists (select 1 from quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
);

-- game_players: lectura pública (ranking/sala), cualquier autenticado puede unirse
create policy "game_players_select_public" on game_players for select using (true);
create policy "game_players_insert_self" on game_players for insert with check (true);

-- game_answers: lectura pública para calcular ranking, inserción propia
create policy "game_answers_select_public" on game_answers for select using (true);
create policy "game_answers_insert_self" on game_answers for insert with check (true);