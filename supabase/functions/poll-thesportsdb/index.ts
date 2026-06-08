/**
 * poll-thesportsdb — Supabase Edge Function
 *
 * Schedule: every 10 minutes — cron: "0,10,20,30,40,50 * * * *"
 *
 * Fetches live score from TheSportsDB V1 (free key "3") and writes
 * to match_latest.tdb_* columns. When FT is detected, fetches ESPN
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
// TheSportsDB V1 fetch
// ---------------------------------------------------------------------------

interface TdbEvent {
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus:    string | null;
  strProgress:  string | null;
}

async function fetchTdb(
  tdbId: string
): Promise<{ home: number | null; away: number | null; status: string | null }> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${tdbId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TDB HTTP ${res.status}`);
  const d = await res.json();
  const ev: TdbEvent | undefined = d.events?.[0];
  if (!ev) throw new Error("TDB: sem evento");

  const home   = ev.intHomeScore != null ? Number(ev.intHomeScore) : null;
  const away   = ev.intAwayScore != null ? Number(ev.intAwayScore) : null;
  const status = ev.strProgress ?? ev.strStatus ?? null;
  return { home, away, status };
}

// ---------------------------------------------------------------------------
// ESPN ad-hoc fetch (chamado quando TDB detecta FT)
// ---------------------------------------------------------------------------

async function fetchEspnAdHoc(
  espnId: string,
  league: string
): Promise<{ home: number | null; away: number | null; possession: number | null; status: string | null }> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${espnId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
  const d = await res.json();

  const comp = d.header?.competitions?.[0];
  const home = comp?.competitors?.find((c: { homeAway: string }) => c.homeAway === "home");
  const away = comp?.competitors?.find((c: { homeAway: string }) => c.homeAway === "away");

  const homeScore = home?.score != null ? Number(home.score) : null;
  const awayScore = away?.score != null ? Number(away.score) : null;
  const status    = comp?.status?.type?.description ?? null;

  const homeStats = (d.boxscore?.teams?.[0]?.statistics ?? []) as Array<{
    name: string;
    displayValue: string;
  }>;
  const possEntry   = homeStats.find((s) => s.name === "possessionPct");
  const possession  = possEntry?.displayValue ? parseFloat(possEntry.displayValue) : null;

  return { home: homeScore, away: awayScore, possession, status };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabase = getSupabase();

  // 1. Encontra jogo ativo com ID da TheSportsDB
  const game = await findActiveGame(supabase);
  if (!game?.thesportsdb_event_id) {
    return new Response(
      JSON.stringify({ ok: true, message: "no active game with thesportsdb_event_id" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const eventId = game.sofascore_id;

  // 2. Verifica se já foi confirmado
  const existing = await getMatchLatest(supabase, eventId);
  if (existing?.final_confirmed) {
    return new Response(
      JSON.stringify({ ok: true, message: "already final_confirmed" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // 3. Busca dados da TheSportsDB
  let tdbHome: number | null = null;
  let tdbAway: number | null = null;
  let tdbStatus: string | null = null;

  try {
    const tdb = await fetchTdb(game.thesportsdb_event_id);
    tdbHome   = tdb.home;
    tdbAway   = tdb.away;
    tdbStatus = tdb.status;
  } catch (err) {
    console.error("[poll-thesportsdb] TDB fetch error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const now = new Date().toISOString();
  const isFt = isFinishedStatus(tdbStatus);

  // 4. Upsert match_latest com dados TDB
  //    home_score/away_score são atualizados durante o jogo para exibição ao vivo
  const upsertRow: Record<string, unknown> = {
    event_id:       eventId,
    match_url:      game.sofascore_id ? `https://www.sofascore.com/match/${game.sofascore_id}` : null,
    home_team:      game.home_team,
    away_team:      game.away_team,
    source:         "multi-source",
    tdb_home_score: tdbHome,
    tdb_away_score: tdbAway,
    tdb_status:     tdbStatus,
    tdb_fetched_at: now,
    fetched_at:     now,
    updated_at:     now,
  };

  // Atualiza placar ao vivo apenas se TDB tem dados (não sobrescreve um valor já existente com null)
  if (tdbHome != null) {
    upsertRow.home_score = tdbHome;
    upsertRow.away_score = tdbAway;
    upsertRow.status     = tdbStatus;
  }

  const { error: upsertError } = await supabase
    .from("match_latest")
    .upsert(upsertRow, { onConflict: "event_id" });

  if (upsertError) {
    console.error("[poll-thesportsdb] upsert error:", upsertError.message);
  } else {
    console.log(`[poll-thesportsdb] saved tdb=${tdbHome}-${tdbAway} status=${tdbStatus}`);
  }

  // 5. Se FT detectado pelo TDB, busca ESPN ad-hoc e compara
  let consensus: string | undefined;
  if (isFt) {
    console.log("[poll-thesportsdb] FT detectado — buscando ESPN ad-hoc");

    if (game.espn_event_id) {
      try {
        const league = game.espn_league ?? "fifa.world";
        const espn = await fetchEspnAdHoc(game.espn_event_id, league);

        await supabase
          .from("match_latest")
          .update({
            espn_home_score:  espn.home,
            espn_away_score:  espn.away,
            espn_possession:  espn.possession,
            espn_status:      espn.status,
            espn_fetched_at:  new Date().toISOString(),
          })
          .eq("event_id", eventId);
      } catch (err) {
        console.warn("[poll-thesportsdb] ESPN ad-hoc falhou:", err);
      }
    }

    consensus = await compareAndFinalize(supabase, game, eventId);
    console.log(`[poll-thesportsdb] consensus=${consensus}`);
  }

  return new Response(
    JSON.stringify({
      ok:       true,
      score:    `${tdbHome ?? "?"}-${tdbAway ?? "?"}`,
      status:   tdbStatus,
      ft:       isFt,
      consensus,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
