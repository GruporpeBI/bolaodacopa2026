/**
 * POST /api/admin/sync-result-auto?game_id=X
 *
 * Fetches the final result of a game automatically:
 *   1. Tries ESPN first (free, no quota, returns score + possession)
 *   2. Falls back to API-Football if ESPN doesn't have the result
 *
 * Updates games table and recalculates all user scores.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { recalculateScores } from "@/app/admin/actions";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const jar = await cookies();
  if (jar.get("admin_access")) return true;
  if (req.headers.get("x-sync-secret") === process.env.SYNC_SECRET) return true;
  return false;
}

// ---------------------------------------------------------------------------
// API-Football dual-key fetch
// ---------------------------------------------------------------------------

async function fetchAf(url: string): Promise<Response> {
  const k1 = process.env.API_FOOTBALL_KEY ?? "";
  const k2 = process.env.API_FOOTBALL_KEY_2 ?? "";
  const r1 = await fetch(url, { headers: { "x-apisports-key": k1 } });
  const rem = Number(r1.headers.get("x-ratelimit-requests-remaining") ?? "1");
  if ((r1.status === 429 || rem === 0) && k2) {
    return fetch(url, { headers: { "x-apisports-key": k2 } });
  }
  return r1;
}

// ---------------------------------------------------------------------------
// ESPN fetch — returns null if match not finished or data not available
// ---------------------------------------------------------------------------

interface MatchResult {
  homeScore:   number;
  awayScore:   number;
  possession:  number | null;
  source:      "espn" | "apifootball";
}

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "").trim();
}

async function fetchFromEspn(
  espnId: string,
  espnLeague: string,
  dbHomeTeam: string,
  dbAwayTeam: string
): Promise<MatchResult | null> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnLeague}/summary?event=${espnId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();

    const comp      = d.header?.competitions?.[0];
    const completed = comp?.status?.type?.completed === true;
    if (!completed) return null;

    const competitors = comp?.competitors ?? [];
    const c0 = competitors[0];
    const c1 = competitors[1];
    if (!c0 || !c1) return null;

    const c0Score = c0.score != null ? Number(c0.score) : null;
    const c1Score = c1.score != null ? Number(c1.score) : null;
    if (c0Score == null || c1Score == null) return null;

    // Match ESPN competitors to our DB home/away by team name
    const dbHome = normalizeTeam(dbHomeTeam);
    const dbAway = normalizeTeam(dbAwayTeam);
    const n0     = normalizeTeam(c0.team?.displayName ?? c0.team?.name ?? "");
    const n1     = normalizeTeam(c1.team?.displayName ?? c1.team?.name ?? "");

    let homeScore: number;
    let awayScore: number;
    let espnHomeIdx: number; // which ESPN competitor is our home team (for possession lookup)

    const c0IsHome = n0.includes(dbHome) || dbHome.includes(n0);
    if (c0IsHome) {
      homeScore    = c0Score;
      awayScore    = c1Score;
      espnHomeIdx  = 0;
    } else {
      // c1 is our home team (ESPN has teams flipped relative to our DB)
      homeScore    = c1Score;
      awayScore    = c0Score;
      espnHomeIdx  = 1;
      void n1; // used implicitly
    }

    const homeStats = (d.boxscore?.teams?.[espnHomeIdx]?.statistics ?? []) as Array<{
      name: string; displayValue: string;
    }>;
    const possEntry  = homeStats.find((s) => s.name === "possessionPct");
    const possession = possEntry?.displayValue ? parseFloat(possEntry.displayValue) : null;

    return { homeScore, awayScore, possession, source: "espn" };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API-Football fetch
// ---------------------------------------------------------------------------

async function fetchFromApiFootball(
  fixtureId: string
): Promise<MatchResult | null> {
  const base = "https://v3.football.api-sports.io";
  try {
    const [fixRes, stRes] = await Promise.all([
      fetchAf(`${base}/fixtures?id=${fixtureId}`).then((r) => r.json()),
      fetchAf(`${base}/fixtures/statistics?fixture=${fixtureId}`).then((r) => r.json()),
    ]);

    const fix = fixRes.response?.[0];
    if (!fix) return null;

    // Only use if game is actually finished
    const shortStatus = fix.fixture?.status?.short;
    if (!["FT", "AET", "PEN"].includes(shortStatus ?? "")) return null;

    const homeScore = fix.goals?.home  as number | null;
    const awayScore = fix.goals?.away  as number | null;
    if (homeScore == null || awayScore == null) return null;

    const homeStats = (stRes.response?.[0]?.statistics ?? []) as Array<{
      type: string;
      value: string;
    }>;
    const possEntry  = homeStats.find((s) => s.type === "Ball Possession");
    const possession = possEntry?.value
      ? parseFloat(possEntry.value.replace("%", ""))
      : null;

    return { homeScore, awayScore, possession, source: "apifootball" };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gameId = req.nextUrl.searchParams.get("game_id");
  if (!gameId) {
    return NextResponse.json({ error: "game_id obrigatório" }, { status: 400 });
  }

  const db = getDb();

  const { data: game, error: findErr } = await db
    .from("games")
    .select("id, home_team, away_team, espn_event_id, espn_league, api_football_fixture_id")
    .eq("id", gameId)
    .single();

  if (findErr || !game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  // No external IDs configured yet
  if (!game.espn_event_id && !game.api_football_fixture_id) {
    return NextResponse.json(
      {
        error:
          "IDs externos não configurados. Execute o Enrich IDs automático (sync diário) ou configure manualmente no banco.",
      },
      { status: 422 }
    );
  }

  // 1. Try ESPN first
  let result: MatchResult | null = null;

  if (game.espn_event_id) {
    result = await fetchFromEspn(
      game.espn_event_id,
      game.espn_league ?? "fifa.world",
      game.home_team,
      game.away_team
    );
    if (result) console.log(`[sync-auto] ESPN found: ${result.homeScore}-${result.awayScore}`);
    else        console.log("[sync-auto] ESPN: match not finished or no data");
  }

  // 2. Fall back to API-Football
  if (!result && game.api_football_fixture_id) {
    result = await fetchFromApiFootball(game.api_football_fixture_id);
    if (result) console.log(`[sync-auto] AF found: ${result.homeScore}-${result.awayScore}`);
    else        console.log("[sync-auto] AF: match not finished or no data");
  }

  if (!result) {
    return NextResponse.json(
      {
        error:
          "Resultado não disponível ainda. O jogo pode não ter terminado ou as APIs não retornaram dados finais.",
      },
      { status: 404 }
    );
  }

  // Update game
  const { error: updateErr } = await db
    .from("games")
    .update({
      home_score:           result.homeScore,
      away_score:           result.awayScore,
      ball_possession_home: result.possession != null ? Math.round(result.possession) : null,
    } as never)
    .eq("id", gameId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Recalculate scores
  await recalculateScores();

  return NextResponse.json({
    ok:         true,
    source:     result.source,
    home_score: result.homeScore,
    away_score: result.awayScore,
    possession: result.possession,
    home_team:  game.home_team,
    away_team:  game.away_team,
  });
}
