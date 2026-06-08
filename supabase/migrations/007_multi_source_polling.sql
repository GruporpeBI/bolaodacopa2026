-- Migration 007: multi-source polling
-- Adds external source IDs to games and creates match_latest with multi-source columns

-- IDs de fontes externas na tabela games
alter table games
  add column if not exists thesportsdb_event_id    text,
  add column if not exists espn_event_id            text,
  add column if not exists espn_league              text default 'fifa.world',
  add column if not exists api_football_fixture_id  text;

-- match_latest: criada aqui com todas as colunas (inclui multi-source)
create table if not exists match_latest (
  event_id          bigint primary key,
  source            text not null default 'multi-source',
  match_url         text,
  home_team         text,
  away_team         text,
  status            text,
  home_score        integer,
  away_score        integer,
  home_possession   integer,
  away_possession   integer,
  goals             jsonb not null default '[]'::jsonb,
  raw               jsonb not null default '{}'::jsonb,
  fetched_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- TheSportsDB (score a cada 10 min)
  tdb_home_score    integer,
  tdb_away_score    integer,
  tdb_status        text,
  tdb_fetched_at    timestamptz,

  -- ESPN (score + posse + gols a cada 20 min)
  espn_home_score   integer,
  espn_away_score   integer,
  espn_possession   numeric,
  espn_status       text,
  espn_fetched_at   timestamptz,

  -- API-Football (autoritativo, chamado só ao fim ou manualmente)
  af_home_score     integer,
  af_away_score     integer,
  af_possession     numeric,
  af_status         text,
  af_fetched_at     timestamptz,

  -- Consenso entre fontes
  -- 'pending' | 'agreed' | 'conflict' | 'confirmed' | 'manual_needed'
  consensus_status  text not null default 'pending',
  final_confirmed   boolean not null default false
);

-- match_snapshots: séries temporais de estados do jogo
create table if not exists match_snapshots (
  id          bigserial primary key,
  event_id    bigint not null,
  source      text not null default 'multi-source',
  match_url   text,
  status      text,
  home_score  integer,
  away_score  integer,
  home_possession integer,
  away_possession integer,
  goals       jsonb not null default '[]'::jsonb,
  raw         jsonb not null default '{}'::jsonb,
  fetched_at  timestamptz not null default now()
);

create index if not exists match_snapshots_event_fetched_idx
  on match_snapshots (event_id, fetched_at desc);

-- Se a tabela já existia (edge cases), adiciona colunas faltantes
do $$ begin
  alter table match_latest add column if not exists tdb_home_score    integer;
  alter table match_latest add column if not exists tdb_away_score    integer;
  alter table match_latest add column if not exists tdb_status        text;
  alter table match_latest add column if not exists tdb_fetched_at    timestamptz;
  alter table match_latest add column if not exists espn_home_score   integer;
  alter table match_latest add column if not exists espn_away_score   integer;
  alter table match_latest add column if not exists espn_possession   numeric;
  alter table match_latest add column if not exists espn_status       text;
  alter table match_latest add column if not exists espn_fetched_at   timestamptz;
  alter table match_latest add column if not exists af_home_score     integer;
  alter table match_latest add column if not exists af_away_score     integer;
  alter table match_latest add column if not exists af_possession     numeric;
  alter table match_latest add column if not exists af_status         text;
  alter table match_latest add column if not exists af_fetched_at     timestamptz;
  alter table match_latest add column if not exists consensus_status  text not null default 'pending';
  alter table match_latest add column if not exists final_confirmed   boolean not null default false;
exception when others then null;
end $$;
