import pg from '../api/api/node_modules/pg/lib/index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { Client } = pg;

// Read connection from env file
const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');

// Parse DB password from seed-games reference connection
// Using the project ref from SUPABASE_URL
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const projectRef = urlMatch?.[1]?.trim().match(/https:\/\/([a-z]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

// Use Supabase transaction pooler (works when direct DB is restricted)
// Format: postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543
const connectionString = `postgresql://postgres.${projectRef}:hyahTpLHam76v9xV@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;

const migrationSQL = `
-- Migration 007: multi-source polling columns
alter table games
  add column if not exists thesportsdb_event_id    text,
  add column if not exists espn_event_id            text,
  add column if not exists espn_league              text default 'fifa.world',
  add column if not exists api_football_fixture_id  text;

alter table match_latest
  add column if not exists tdb_home_score    integer,
  add column if not exists tdb_away_score    integer,
  add column if not exists tdb_status        text,
  add column if not exists tdb_fetched_at    timestamptz,
  add column if not exists espn_home_score   integer,
  add column if not exists espn_away_score   integer,
  add column if not exists espn_possession   numeric,
  add column if not exists espn_status       text,
  add column if not exists espn_fetched_at   timestamptz,
  add column if not exists af_home_score     integer,
  add column if not exists af_away_score     integer,
  add column if not exists af_possession     numeric,
  add column if not exists af_status         text,
  add column if not exists af_fetched_at     timestamptz,
  add column if not exists consensus_status  text not null default 'pending',
  add column if not exists final_confirmed   boolean not null default false;

-- Populate known ESPN IDs for completed friendlies
update games set espn_event_id = '401864003', espn_league = 'fifa.friendly'
where (home_team ilike '%panama%' and away_team ilike '%brazil%')
   or (home_team ilike '%brazil%' and away_team ilike '%panama%');

update games set espn_event_id = '401861998', espn_league = 'fifa.friendly'
where (home_team ilike '%brazil%' and away_team ilike '%egypt%')
   or (home_team ilike '%egypt%' and away_team ilike '%brazil%');
`;

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Connected to', projectRef);
  await client.query(migrationSQL);
  console.log('✅ Migration 007 applied successfully');

  // Verify columns were added
  const res = await client.query(`
    select column_name from information_schema.columns
    where table_schema='public' and table_name='games'
      and column_name in ('espn_event_id','api_football_fixture_id','thesportsdb_event_id')
    order by column_name;
  `);
  console.log('✅ New columns in games:', res.rows.map(r => r.column_name).join(', '));

  // Check ESPN IDs populated
  const espn = await client.query(`
    select home_team, away_team, espn_event_id, espn_league
    from games where espn_event_id is not null;
  `);
  console.log('✅ ESPN IDs populated:', espn.rows.length, 'game(s)');
  espn.rows.forEach(r => console.log(`   ${r.home_team} × ${r.away_team} → ESPN ${r.espn_event_id} (${r.espn_league})`));
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
