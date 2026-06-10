/**
 * POST /api/admin/enrich-ids
 *
 * Auto-discovers thesportsdb_event_id, espn_event_id, espn_league and
 * api_football_fixture_id for all games that are missing any of those IDs.
 *
 * Sources queried (1 bulk request each):
 *   1. TheSportsDB   → /eventsseason.php?id=4328&s=2026-2027 (extrai intAPIfootballID também)
 *   2. ESPN          → /scoreboard?limit=200&dates=20260611-20260719
 *   3. API-Football  → /fixtures?league=1&season=2026 (fallback se TDB não tiver intAPIfootballID)
 *
 * Team name matching uses a normalizer to handle aliases like
 * "United States" ↔ "USA", "Republic of Korea" ↔ "South Korea", etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function isAdmin(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_access")) return true;
  if (req.headers.get("x-sync-secret") === process.env.SYNC_SECRET) return true;
  return false;
}

// ---------------------------------------------------------------------------
// DB client (service role)
// ---------------------------------------------------------------------------

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ---------------------------------------------------------------------------
// API-Football dual-key fetch
// ---------------------------------------------------------------------------

async function fetchAf(url: string): Promise<Response> {
  const key1 = process.env.API_FOOTBALL_KEY ?? "";
  const key2 = process.env.API_FOOTBALL_KEY_2 ?? "";
  const res1 = await fetch(url, { headers: { "x-apisports-key": key1 } });
  const remaining = Number(res1.headers.get("x-ratelimit-requests-remaining") ?? "1");
  if ((res1.status === 429 || remaining === 0) && key2) {
    return fetch(url, { headers: { "x-apisports-key": key2 } });
  }
  return res1;
}

// ---------------------------------------------------------------------------
// Team name normalizer — handles common aliases between sources
// ---------------------------------------------------------------------------

const ALIASES: Record<string, string> = {
  "united states":   "usa",
  "u.s.a.":          "usa",
  "us":              "usa",
  "republic of korea": "south korea",
  "korea republic":  "south korea",
  "czech republic":  "czechia",
  "ir iran":         "iran",
  "chinese taipei":  "taiwan",
  "côte d'ivoire":   "ivory coast",
  "cote d'ivoire":   "ivory coast",
  "bosnia & herzegovina": "bosnia and herzegovina",
  "trinidadtobago":  "trinidad and tobago",
  "trinidad & tobago": "trinidad and tobago",
};

function normalize(name: string): string {
  const s = name.toLowerCase().trim().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  return ALIASES[s] ?? s;
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function datesMatch(d1: string, d2: string): boolean {
  return d1.slice(0, 10) === d2.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Source: API-Football — all WC 2026 fixtures
// ---------------------------------------------------------------------------

interface AfFixture {
  fixture: { id: number; date: string };
  teams:   { home: { id: number; name: string }; away: { id: number; name: string } };
  league:  { id: number; name: string };
}

async function loadAfFixtures(): Promise<AfFixture[]> {
  const url = "https://v3.football.api-sports.io/fixtures?league=1&season=2026";
  const res = await fetchAf(url);
  if (!res.ok) {
    console.warn(`[enrich-ids] AF fixtures HTTP ${res.status}`);
    return [];
  }
  const data = await res.json() as { response: AfFixture[] };
  return data.response ?? [];
}

// ---------------------------------------------------------------------------
// Source: ESPN — WC 2026 scoreboard (all games in one call)
// ---------------------------------------------------------------------------

interface EspnEvent {
  id: string;
  competitions: Array<{
    date: string;
    competitors: Array<{ homeAway: string; team: { displayName: string } }>;
  }>;
}

async function loadEspnEvents(): Promise<EspnEvent[]> {
  // WC 2026: June 11 – July 19, 2026
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719";
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[enrich-ids] ESPN scoreboard HTTP ${res.status}`);
      return [];
    }
    const data = await res.json() as { events: EspnEvent[] };
    return data.events ?? [];
  } catch (err) {
    console.warn("[enrich-ids] ESPN fetch error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: TheSportsDB — WC season events (league 4328 = FIFA World Cup)
// ---------------------------------------------------------------------------

interface TdbEvent {
  idEvent:        string;
  strHomeTeam:    string;
  strAwayTeam:    string;
  dateEvent:      string; // YYYY-MM-DD
  strLeague:      string;
  idAPIfootball?: string | number; // ID da API-Football já incluído no TDB
}

async function loadTdbEvents(): Promise<TdbEvent[]> {
  // Try season endpoint for FIFA World Cup (league 4328, season 2026-2027)
  const url = "https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4328&s=2026-2027";
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[enrich-ids] TDB season HTTP ${res.status}`);
      return [];
    }
    const data = await res.json() as { events: TdbEvent[] | null };
    return data.events ?? [];
  } catch (err) {
    console.warn("[enrich-ids] TDB season fetch error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

function findAfFixture(game: GameRow, fixtures: AfFixture[]): AfFixture | undefined {
  return fixtures.find((f) =>
    datesMatch(game.scheduled_at, f.fixture.date) &&
    (
      (teamsMatch(game.home_team, f.teams.home.name) && teamsMatch(game.away_team, f.teams.away.name)) ||
      (teamsMatch(game.home_team, f.teams.away.name) && teamsMatch(game.away_team, f.teams.home.name))
    )
  );
}

function findEspnEvent(game: GameRow, events: EspnEvent[]): EspnEvent | undefined {
  return events.find((e) => {
    const comp = e.competitions?.[0];
    if (!comp) return false;
    if (!datesMatch(game.scheduled_at, comp.date)) return false;
    const home = comp.competitors?.find((c) => c.homeAway === "home")?.team.displayName ?? "";
    const away = comp.competitors?.find((c) => c.homeAway === "away")?.team.displayName ?? "";
    return (
      (teamsMatch(game.home_team, home) && teamsMatch(game.away_team, away)) ||
      (teamsMatch(game.home_team, away) && teamsMatch(game.away_team, home))
    );
  });
}

function findTdbEvent(game: GameRow, events: TdbEvent[]): TdbEvent | undefined {
  return events.find((e) =>
    datesMatch(game.scheduled_at, e.dateEvent) &&
    (
      (teamsMatch(game.home_team, e.strHomeTeam) && teamsMatch(game.away_team, e.strAwayTeam)) ||
      (teamsMatch(game.home_team, e.strAwayTeam) && teamsMatch(game.away_team, e.strHomeTeam))
    )
  );
}

// ---------------------------------------------------------------------------
// Game row type
// ---------------------------------------------------------------------------

interface GameRow {
  id: string;
  home_team: string;
  away_team: string;
  scheduled_at: string;
  sofascore_id: number | null;
  thesportsdb_event_id: string | null;
  espn_event_id: string | null;
  espn_league: string | null;
  api_football_fixture_id: string | null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Fetch games that are missing at least one external ID
  const { data: gamesData, error: dbError } = await db
    .from("games")
    .select(
      "id, home_team, away_team, scheduled_at, sofascore_id, thesportsdb_event_id, espn_event_id, espn_league, api_football_fixture_id"
    )
    .or(
      "thesportsdb_event_id.is.null,espn_event_id.is.null,api_football_fixture_id.is.null"
    )
    .neq("home_team", "A definir")  // skip games with unknown teams
    .neq("away_team", "A definir")
    .order("scheduled_at");

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const games = (gamesData ?? []) as GameRow[];
  if (games.length === 0) {
    return NextResponse.json({ ok: true, message: "Todos os IDs já estão preenchidos.", updated: 0 });
  }

  // Load all fixtures/events from each source in parallel
  const [afFixtures, espnEvents, tdbEvents] = await Promise.all([
    loadAfFixtures(),
    loadEspnEvents(),
    loadTdbEvents(),
  ]);

  console.log(`[enrich-ids] sources: AF=${afFixtures.length} ESPN=${espnEvents.length} TDB=${tdbEvents.length}`);

  let updated = 0;
  const results: Array<{ game: string; af: boolean; espn: boolean; tdb: boolean }> = [];

  for (const game of games) {
    const patch: Partial<GameRow> = {};

    // API-Football
    if (!game.api_football_fixture_id) {
      const af = findAfFixture(game, afFixtures);
      if (af) patch.api_football_fixture_id = String(af.fixture.id);
    }

    // ESPN
    if (!game.espn_event_id) {
      const espn = findEspnEvent(game, espnEvents);
      if (espn) {
        patch.espn_event_id = espn.id;
        patch.espn_league   = "fifa.world";
      }
    }

    // TheSportsDB — também extrai idAPIfootball se disponível
    if (!game.thesportsdb_event_id) {
      const tdb = findTdbEvent(game, tdbEvents);
      if (tdb) {
        patch.thesportsdb_event_id = tdb.idEvent;
        // Se TDB tem o ID de API-Football, usa direto (não precisa de busca separada)
        if (!game.api_football_fixture_id && tdb.idAPIfootball) {
          patch.api_football_fixture_id = String(tdb.idAPIfootball);
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await db.from("games").update(patch as never).eq("id", game.id);
      if (!error) {
        updated++;
        results.push({
          game: `${game.home_team} × ${game.away_team}`,
          af:   "api_football_fixture_id" in patch,
          espn: "espn_event_id" in patch,
          tdb:  "thesportsdb_event_id" in patch,
        });
      } else {
        console.error(`[enrich-ids] update error for game ${game.id}:`, error.message);
      }
    }
  }

  return NextResponse.json({
    ok:        true,
    scanned:   games.length,
    updated,
    sources:   { af: afFixtures.length, espn: espnEvents.length, tdb: tdbEvents.length },
    results,
  });
}
