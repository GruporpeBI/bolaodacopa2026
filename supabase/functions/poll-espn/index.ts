/**
 * poll-espn — Supabase Edge Function
 *
 * Schedule: every 20 minutes — cron: "0,20,40 * * * *"
 *
 * Fetches score + possession + goals from ESPN Hidden API and writes
 * to match_latest.espn_* columns. When FT is detected, fetches TDB
 * ad-hoc and runs the consensus comparison (compareAndFinalize).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  findActiveGame,
  getMatchLatest,
  isFinishedStatus,
  compareAndFinalize,
} from "../_shared/multi-source.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

// ---------------------------------------------------------------------------
// ESPN API types
// ---------------------------------------------------------------------------

interface EspnCompetitor {
  homeAway: string;
  score:    string;
  id:       string;
}

interface EspnStat {
  name:         string;
  displayValue: string;
}

interface EspnKeyEvent {
  type?:         { type?: string };
  clock?:        { displayValue?: string };
  team?:         { id?: string };
  participants?: Array<{ athlete?: { displayName?: string } }>;
  text?:         string;
}

// ---------------------------------------------------------------------------
// ESPN fetch
// ---------------------------------------------------------------------------

interface EspnMatchData {
  home:       number | null;
  away:       number | null;
  possession: number | null;
  status:     string | null;
  completed:  boolean;
  homeTeamId: string | null;
  goals:      Array<{
    minute:  string | null;
    team:    "home" | "away";
    player:  string | null;
  }>;
}

async function fetchEspn(espnId: string, league: string): Promise<EspnMatchData> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${espnId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
  const d = await res.json();

  const comp       = d.header?.competitions?.[0];
  const competitors = (comp?.competitors ?? []) as EspnCompetitor[];
  const homeC      = competitors.find((c) => c.homeAway === "home");
  const awayC      = competitors.find((c) => c.homeAway === "away");

  const homeScore  = homeC?.score != null ? Number(homeC.score) : null;
  const awayScore  = awayC?.score != null ? Number(awayC.score) : null;
  const status     = comp?.status?.type?.description ?? null;
  const completed  = comp?.status?.type?.completed === true;
  const homeTeamId = homeC?.id ?? null;

  // Posse de bola
  const homeStats = (d.boxscore?.teams?.[0]?.statistics ?? []) as EspnStat[];
  const possEntry  = homeStats.find((s) => s.name === "possessionPct");
  const possession = possEntry?.displayValue ? parseFloat(possEntry.displayValue) : null;

  // Gols via keyEvents
  const goals = ((d.keyEvents ?? []) as EspnKeyEvent[])
    .filter((e) => e.type?.type === "goal")
    .map((e) => ({
      minute: e.clock?.displayValue ?? null,
      team:   (e.team?.id === homeTeamId ? "home" : "away") as "home" | "away",
      player: e.participants?.[0]?.athlete?.displayName ?? null,
    }));

  return { home: homeScore, away: awayScore, possession, status, completed, homeTeamId, goals };
}

// ---------------------------------------------------------------------------
// TDB ad-hoc fetch (chamado quando ESPN detecta FT)
// ---------------------------------------------------------------------------

async function fetchTdbAdHoc(
  tdbId: string
): Promise<{ home: number | null; away: number | null; status: string | null }> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${tdbId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TDB HTTP ${res.status}`);
  const d  = await res.json();
  const ev = d.events?.[0];
  if (!ev) throw new Error("TDB: sem evento");
  return {
    home:   ev.intHomeScore != null ? Number(ev.intHomeScore) : null,
    away:   ev.intAwayScore != null ? Number(ev.intAwayScore) : null,
    status: ev.strProgress ?? ev.strStatus ?? null,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabase = getSupabase();

  // 1. Encontra jogo ativo com ID da ESPN
  const game = await findActiveGame(supabase);
  if (!game?.espn_event_id) {
    return new Response(
      JSON.stringify({ ok: true, message: "no active game with espn_event_id" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const eventId = game.sofascore_id;

  // 2. Verifica se já confirmado
  const existing = await getMatchLatest(supabase, eventId);
  if (existing?.final_confirmed) {
    return new Response(
      JSON.stringify({ ok: true, message: "already final_confirmed" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // 3. Busca dados da ESPN
  let espnData: EspnMatchData;
  try {
    const league = game.espn_league ?? "fifa.world";
    espnData = await fetchEspn(game.espn_event_id, league);
  } catch (err) {
    console.error("[poll-espn] ESPN fetch error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const now  = new Date().toISOString();
  const isFt = espnData.completed || isFinishedStatus(espnData.status);

  // 4. Upsert match_latest com dados ESPN
  const upsertRow: Record<string, unknown> = {
    event_id:        eventId,
    match_url:       game.sofascore_id ? `https://www.sofascore.com/match/${game.sofascore_id}` : null,
    home_team:       game.home_team,
    away_team:       game.away_team,
    source:          "multi-source",
    espn_home_score: espnData.home,
    espn_away_score: espnData.away,
    espn_possession: espnData.possession,
    espn_status:     espnData.status,
    espn_fetched_at: now,
    goals:           JSON.stringify(espnData.goals),
    fetched_at:      now,
    updated_at:      now,
  };

  // ESPN é mais rico — atualiza placar ao vivo com dados ESPN se disponíveis
  if (espnData.home != null) {
    upsertRow.home_score      = espnData.home;
    upsertRow.away_score      = espnData.away;
    upsertRow.home_possession = espnData.possession;
    upsertRow.away_possession = espnData.possession != null
      ? Math.round((100 - espnData.possession) * 10) / 10
      : null;
    upsertRow.status = espnData.status;
  }

  const { error: upsertError } = await supabase
    .from("match_latest")
    .upsert(upsertRow, { onConflict: "event_id" });

  if (upsertError) {
    console.error("[poll-espn] upsert error:", upsertError.message);
  } else {
    console.log(
      `[poll-espn] saved espn=${espnData.home}-${espnData.away} poss=${espnData.possession} goals=${espnData.goals.length} status=${espnData.status}`
    );
  }

  // 5. Se FT detectado pela ESPN, busca TDB ad-hoc e compara
  let consensus: string | undefined;
  if (isFt) {
    console.log("[poll-espn] FT detectado — buscando TDB ad-hoc");

    if (game.thesportsdb_event_id) {
      try {
        const tdb = await fetchTdbAdHoc(game.thesportsdb_event_id);
        await supabase
          .from("match_latest")
          .update({
            tdb_home_score: tdb.home,
            tdb_away_score: tdb.away,
            tdb_status:     tdb.status,
            tdb_fetched_at: new Date().toISOString(),
          })
          .eq("event_id", eventId);
      } catch (err) {
        console.warn("[poll-espn] TDB ad-hoc falhou:", err);
      }
    }

    consensus = await compareAndFinalize(supabase, game, eventId);
    console.log(`[poll-espn] consensus=${consensus}`);
  }

  return new Response(
    JSON.stringify({
      ok:        true,
      score:     `${espnData.home ?? "?"}-${espnData.away ?? "?"}`,
      possession: espnData.possession,
      goals:     espnData.goals.length,
      status:    espnData.status,
      ft:        isFt,
      consensus,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
