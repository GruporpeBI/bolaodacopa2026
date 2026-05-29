"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getWorldCupMatches } from "@/lib/football-api";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";
import { teamName } from "@/lib/team-names";

function getAdminClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PredictionRow = Database["public"]["Tables"]["predictions"]["Row"];
type AttendanceRow = Database["public"]["Tables"]["attendances"]["Row"];
type TournamentPredRow = Database["public"]["Tables"]["tournament_predictions"]["Row"];
type ScoreInsert = Database["public"]["Tables"]["scores"]["Insert"];

function stageFromFD(stage: string): GameRow["stage"] {
  const map: Record<string, GameRow["stage"]> = {
    GROUP_STAGE: "group",
    LAST_16: "round_of_16",
    QUARTER_FINALS: "quarterfinal",
    SEMI_FINALS: "semifinal",
    FINAL: "final",
  };
  return map[stage] ?? "group";
}

export async function syncGamesFromAPI(): Promise<{ success: boolean; synced: number; error?: string }> {
  // Usa service role para contornar RLS nas escritas
  const supabase = getAdminClient();

  const matches = await getWorldCupMatches();
  if (!matches.length) {
    return { success: false, synced: 0, error: "Nenhum jogo retornado da API. Verifique o token." };
  }

  let synced = 0;

  for (const match of matches) {
    const isBrazil =
      match.homeTeam.tla === "BRA" ||
      match.awayTeam.tla === "BRA" ||
      match.homeTeam.shortName === "Brazil" ||
      match.awayTeam.shortName === "Brazil";

    const isFinal = match.stage === "FINAL";
    const isSemi = match.stage === "SEMI_FINALS";

    const record = {
      external_id: match.id,
      home_team: match.homeTeam.name || "A definir",
      away_team: match.awayTeam.name || "A definir",
      stage: stageFromFD(match.stage),
      scheduled_at: match.utcDate,
      home_score: match.score.fullTime.home,
      away_score: match.score.fullTime.away,
      is_brazil_game: isBrazil,
      is_final: isFinal,
      // Habilita automaticamente jogos do Brasil; semis/final ficam para o admin decidir
      is_enabled: isBrazil && !isSemi && !isFinal,
    };

    const { error } = await supabase
      .from("games")
      .upsert(record as never, { onConflict: "external_id", ignoreDuplicates: false });

    if (!error) synced++;
  }

  revalidatePath("/admin");
  return { success: true, synced };
}

export async function toggleGameEnabled(
  gameId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("games")
    .update({ is_enabled: enabled } as never)
    .eq("id", gameId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleGamePredictionsEarly(
  gameId: string,
  early: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("games")
    .update({ predictions_early: early } as never)
    .eq("id", gameId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/palpites");
  return { success: true };
}

export async function toggleGameRanking(
  gameId: string,
  visible: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("games")
    .update({ ranking_visible: visible } as never)
    .eq("id", gameId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/ranking");
  return { success: true };
}

export async function updateGameResult(
  gameId: string,
  homeScore: number,
  awayScore: number,
  possession: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await supabase
    .from("games")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      ball_possession_home: possession,
    } as never)
    .eq("id", gameId);

  if (error) return { success: false, error: error.message };

  await recalculateScores();

  revalidatePath("/admin");
  revalidatePath("/ranking");
  return { success: true };
}

export async function recalculateScores(): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { data: gamesData } = await supabase
    .from("games")
    .select("*")
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  const games = (gamesData as GameRow[] | null) ?? [];
  if (!games.length) return { success: true };

  const { data: predsData } = await supabase.from("predictions").select("*");
  const predictions = (predsData as PredictionRow[] | null) ?? [];

  const { data: attData } = await supabase.from("attendances").select("*");
  const attendances = (attData as AttendanceRow[] | null) ?? [];

  const { data: tpData } = await supabase.from("tournament_predictions").select("*");
  const tournamentPredictions = (tpData as TournamentPredRow[] | null) ?? [];

  const { data: allUsersData } = await supabase.from("users").select("id");
  const allUsers = (allUsersData as { id: string }[] | null) ?? [];

  const userIds = new Set<string>([
    ...predictions.map((p) => p.user_id),
    ...attendances.map((a) => a.user_id),
    ...tournamentPredictions.map((t) => t.user_id),
    ...allUsers.map((u) => u.id),
  ]);

  const gameMap = new Map(games.map((g) => [g.id, g]));
  const finalGame = games.find((g) => g.is_final);

  const scoresByUser: Record<string, {
    attendance_pts: number;
    result_pts: number;
    exact_score_pts: number;
    tournament_pts: number;
  }> = {};

  for (const uid of userIds) {
    scoresByUser[uid] = { attendance_pts: 0, result_pts: 0, exact_score_pts: 0, tournament_pts: 0 };
  }

  for (const pred of predictions) {
    const game = gameMap.get(pred.game_id);
    if (!game || game.home_score === null || game.away_score === null) continue;

    const uid = pred.user_id;
    if (!scoresByUser[uid]) continue;

    const actualHome = game.home_score;
    const actualAway = game.away_score;
    const predHome = pred.home_score_pred;
    const predAway = pred.away_score_pred;

    const isExact = predHome === actualHome && predAway === actualAway;
    const actualResult = Math.sign(actualHome - actualAway);
    const predResult = Math.sign(predHome - predAway);
    const isResultCorrect = actualResult === predResult;

    if (game.is_final && isExact) {
      scoresByUser[uid].exact_score_pts += 121;
    } else if (isExact) {
      scoresByUser[uid].exact_score_pts += 30;
    } else if (isResultCorrect) {
      scoresByUser[uid].result_pts += 16;
    }
  }

  for (const att of attendances) {
    const game = gameMap.get(att.game_id);
    if (!game) continue;

    const uid = att.user_id;
    if (!scoresByUser[uid]) continue;

    if (game.is_final) {
      scoresByUser[uid].attendance_pts += 100;
    } else if (game.is_brazil_game) {
      scoresByUser[uid].attendance_pts += 51;
    }
  }

  // ── Busca semifinais com resultado ───────────────────────────────────────
  const { data: semiFinalGamesData } = await supabase
    .from("games")
    .select("home_team, away_team, home_score, away_score")
    .eq("stage", "semifinal")
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  type SemiGame = Pick<GameRow, "home_team" | "away_team" | "home_score" | "away_score">;
  const semiFinalGames = (semiFinalGamesData as SemiGame[] | null) ?? [];

  // Nomes em PT para comparar com tournament_predictions (que usa PT)
  type SemiResultPT = { home: string; away: string; homeScore: number; awayScore: number };
  const actualSemiResults: SemiResultPT[] = semiFinalGames.map((sg) => ({
    home: teamName(sg.home_team),       // EN → PT
    away: teamName(sg.away_team),       // EN → PT
    homeScore: sg.home_score as number,
    awayScore: sg.away_score as number,
  }));

  const actualSemifinalistsPT = new Set<string>(
    actualSemiResults.flatMap((r) => [r.home, r.away])
  );

  // ── Nomes do jogo da final em PT ─────────────────────────────────────────
  const finalHomePT = finalGame ? teamName(finalGame.home_team) : "";
  const finalAwayPT = finalGame ? teamName(finalGame.away_team) : "";

  // ── Loop: palpites do torneio ─────────────────────────────────────────────
  for (const tp of tournamentPredictions) {
    const uid = tp.user_id;
    if (!scoresByUser[uid]) continue;

    // 27 pts por semifinalista correto (usa nomes PT)
    for (const s of [tp.semi1, tp.semi2, tp.semi3, tp.semi4]) {
      if (actualSemifinalistsPT.has(s)) {
        scoresByUser[uid].tournament_pts += 27;
      }
    }

    // Pontuação de placar/ganhador das semifinais (30 pts exato, 16 pts ganhador)
    // Combinação livre: qualquer par de times correto em qualquer chave conta.
    const userSemis: { teamA: string; teamB: string; scoreA: number; scoreB: number }[] = [
      { teamA: tp.semi1, teamB: tp.semi2, scoreA: tp.sf1_score_a, scoreB: tp.sf1_score_b },
      { teamA: tp.semi3, teamB: tp.semi4, scoreA: tp.sf2_score_a, scoreB: tp.sf2_score_b },
    ];

    for (const userSemi of userSemis) {
      for (const actualSemi of actualSemiResults) {
        // Verifica se os dois times do palpite são os mesmos do jogo real (qualquer ordem)
        const teamsMatch =
          (userSemi.teamA === actualSemi.home && userSemi.teamB === actualSemi.away) ||
          (userSemi.teamA === actualSemi.away && userSemi.teamB === actualSemi.home);

        if (!teamsMatch) continue;

        // Determina placar previsto na orientação do jogo real
        const predHome = userSemi.teamA === actualSemi.home ? userSemi.scoreA : userSemi.scoreB;
        const predAway = userSemi.teamA === actualSemi.home ? userSemi.scoreB : userSemi.scoreA;

        const isExact = predHome === actualSemi.homeScore && predAway === actualSemi.awayScore;
        const actualResult = Math.sign(actualSemi.homeScore - actualSemi.awayScore);
        const predResult = Math.sign(predHome - predAway);

        if (isExact) {
          scoresByUser[uid].exact_score_pts += 30;
        } else if (actualResult === predResult) {
          scoresByUser[uid].result_pts += 16;
        }
        break; // cada palpite de semi só emparelha com uma semi real
      }
    }

    // ── Final ─────────────────────────────────────────────────────────────
    if (finalGame && finalGame.home_score !== null && finalGame.away_score !== null) {
      // 40 pts por finalista correto (PT vs PT)
      for (const f of [tp.finalist1, tp.finalist2]) {
        if (f === finalHomePT || f === finalAwayPT) {
          scoresByUser[uid].tournament_pts += 40;
        }
      }

      // 101 pts por campeão correto (PT vs PT)
      const actualChampionPT =
        finalGame.home_score > finalGame.away_score ? finalHomePT : finalAwayPT;
      if (tp.champion === actualChampionPT) {
        scoresByUser[uid].tournament_pts += 101;
      }

      // 121 pts por placar exato da final — via tournament_predictions
      if (tp.final_score_a !== null && tp.final_score_b !== null) {
        const f1IsHome = tp.finalist1 === finalHomePT;
        const f1IsAway = tp.finalist1 === finalAwayPT;

        const isFinalExact =
          (f1IsHome &&
            tp.final_score_a === finalGame.home_score &&
            tp.final_score_b === finalGame.away_score) ||
          (f1IsAway &&
            tp.final_score_a === finalGame.away_score &&
            tp.final_score_b === finalGame.home_score);

        if (isFinalExact) {
          scoresByUser[uid].exact_score_pts += 121;
        }
      }
    }
  }

  const upserts: ScoreInsert[] = Object.entries(scoresByUser).map(([userId, pts]) => ({
    user_id: userId,
    attendance_pts: pts.attendance_pts,
    result_pts: pts.result_pts,
    exact_score_pts: pts.exact_score_pts,
    tournament_pts: pts.tournament_pts,
    total_pts: pts.attendance_pts + pts.result_pts + pts.exact_score_pts + pts.tournament_pts,
  }));

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("scores")
      .upsert(upserts as never[], { onConflict: "user_id" });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/ranking");
  return { success: true };
}

export async function checkInUser(
  userId: string,
  gameId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("attendances")
    .insert({ user_id: userId, game_id: gameId, verified_by: user?.id ?? null } as never);

  if (error) return { success: false, error: error.message };

  await recalculateScores();
  revalidatePath("/admin");
  return { success: true };
}

// ── Configurações de Geolocalização ──────────────────────────────────────────

export async function getLocationConfig(): Promise<{
  lat: number; lng: number; radiusM: number;
}> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("app_config").select("key, value");
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return {
    lat: parseFloat(map.restaurant_lat ?? "-23.550520"),
    lng: parseFloat(map.restaurant_lng ?? "-46.633309"),
    radiusM: parseInt(map.checkin_radius_m ?? "400", 10),
  };
}

export async function saveLocationConfig(
  lat: number,
  lng: number,
  radiusM: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();
  const rows = [
    { key: "restaurant_lat",  value: String(lat),     updated_at: new Date().toISOString() },
    { key: "restaurant_lng",  value: String(lng),     updated_at: new Date().toISOString() },
    { key: "checkin_radius_m", value: String(radiusM), updated_at: new Date().toISOString() },
  ];
  const { error } = await supabase
    .from("app_config")
    .upsert(rows as never[], { onConflict: "key" });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  return { success: true };
}
