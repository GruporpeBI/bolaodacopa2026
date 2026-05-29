"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";
import { recalculateScores } from "@/app/admin/actions";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PredictionInsert = Database["public"]["Tables"]["predictions"]["Insert"];
type TournamentInsert = Database["public"]["Tables"]["tournament_predictions"]["Insert"];

function getAdminClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getDbUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  // Usa o ID da tabela users armazenado no metadata; fallback para auth user id
  return (user.user_metadata?.users_table_id as string | undefined) ?? user.id;
}

export async function submitPrediction(
  gameId: string,
  homeScore: number,
  awayScore: number,
  possession: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const dbUserId = await getDbUserId(supabase);
  if (!dbUserId) {
    return { success: false, error: "Você precisa estar logado para enviar palpites." };
  }

  const { data: gameData } = await supabase
    .from("games")
    .select("scheduled_at, is_enabled")
    .eq("id", gameId)
    .single();

  const game = gameData as Pick<GameRow, "scheduled_at" | "is_enabled"> | null;

  if (!game) {
    return { success: false, error: "Jogo não encontrado." };
  }

  if (!game.is_enabled) {
    return { success: false, error: "Este jogo não está habilitado para palpites." };
  }

  const deadline = new Date(game.scheduled_at).getTime() - 5 * 60 * 1000;
  if (Date.now() >= deadline) {
    return { success: false, error: "O prazo para palpites deste jogo já encerrou." };
  }

  const payload: PredictionInsert = {
    user_id: dbUserId,
    game_id: gameId,
    home_score_pred: homeScore,
    away_score_pred: awayScore,
    possession_pred: possession,
  };

  const { error: upsertError } = await (supabase
    .from("predictions")
    .upsert(payload as never, { onConflict: "user_id,game_id" }) as unknown as Promise<{ error: { message: string } | null }>);

  if (upsertError) {
    return { success: false, error: "Erro ao salvar palpite. Tente novamente." };
  }

  revalidatePath("/palpites");
  return { success: true };
}

interface TournamentPayload {
  semi1: string; semi2: string; sf1_score_a: number; sf1_score_b: number; sf1_tiebreak: string | null;
  semi3: string; semi4: string; sf2_score_a: number; sf2_score_b: number; sf2_tiebreak: string | null;
  finalist1: string; finalist2: string;
  final_score_a: number; final_score_b: number; final_tiebreak: string | null;
  possession_pred_final: number;
  champion: string;
}

export async function submitTournamentPredictions(
  payload: TournamentPayload
): Promise<{ success: boolean; error?: string }> {
  const { semi1, semi2, semi3, semi4, finalist1, finalist2, champion } = payload;
  const supabase = await createClient();

  const dbUserId = await getDbUserId(supabase);
  if (!dbUserId) {
    return { success: false, error: "Você precisa estar logado para enviar palpites." };
  }

  const { data: brazilGamesData } = await supabase
    .from("games")
    .select("id, scheduled_at")
    .eq("is_brazil_game", true as unknown as string)
    .order("scheduled_at", { ascending: true });

  const brazilGames = (brazilGamesData as Pick<GameRow, "id" | "scheduled_at">[] | null) ?? [];

  const playedBrazilGames = brazilGames.filter(
    (g) => new Date(g.scheduled_at) <= new Date()
  );

  if (playedBrazilGames.length >= 3) {
    return {
      success: false,
      error: "O prazo para palpites do torneio já encerrou (após os 3 primeiros jogos do Brasil).",
    };
  }

  const dbPayload: TournamentInsert = {
    user_id: dbUserId,
    semi1: payload.semi1,
    semi2: payload.semi2,
    sf1_score_a: payload.sf1_score_a,
    sf1_score_b: payload.sf1_score_b,
    sf1_tiebreak: payload.sf1_tiebreak,
    semi3: payload.semi3,
    semi4: payload.semi4,
    sf2_score_a: payload.sf2_score_a,
    sf2_score_b: payload.sf2_score_b,
    sf2_tiebreak: payload.sf2_tiebreak,
    finalist1,
    finalist2,
    final_score_a: payload.final_score_a,
    final_score_b: payload.final_score_b,
    final_tiebreak: payload.final_tiebreak,
    possession_pred_final: payload.possession_pred_final,
    champion,
  };

  const { error: upsertError } = await (supabase
    .from("tournament_predictions")
    .upsert(dbPayload as never, { onConflict: "user_id" }) as unknown as Promise<{ error: { message: string } | null }>);

  if (upsertError) {
    return { success: false, error: "Erro ao salvar palpites do torneio. Tente novamente." };
  }

  revalidatePath("/palpites");
  return { success: true };
}

export async function selfCheckIn(
  gameId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const dbUserId = await getDbUserId(supabase);
  if (!dbUserId) return { success: false, error: "Você precisa estar logado." };

  const { data: game } = await supabase
    .from("games")
    .select("id, is_enabled")
    .eq("id", gameId)
    .maybeSingle() as unknown as { data: { id: string; is_enabled: boolean } | null };

  if (!game || !game.is_enabled) {
    return { success: false, error: "Jogo não encontrado ou não habilitado." };
  }

  const { data: existing } = await supabase
    .from("attendances")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Presença já registrada para este jogo." };
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("attendances")
    .insert({ user_id: dbUserId, game_id: gameId, verified_by: "geo" } as never);

  if (error) return { success: false, error: "Erro ao registrar presença." };

  await recalculateScores();
  revalidatePath("/ranking");
  revalidatePath("/palpites");
  return { success: true };
}

// Retorna o jogo do Brasil de hoje + config de localização para check-in no login
export async function getTodayCheckInGame(): Promise<{
  gameId: string;
  restaurantLat: number;
  restaurantLng: number;
  radiusM: number;
} | null> {
  try {
    const supabase = await createClient();

    // Data de hoje em Brasília (UTC-3)
    const now = new Date();
    const brasilia = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const today = brasilia.toISOString().slice(0, 10);

    const { data: gamesRaw } = await supabase
      .from("games")
      .select("id, scheduled_at")
      .eq("is_enabled", true as unknown as string)
      .eq("is_brazil_game", true as unknown as string);

    type GameBasic = { id: string; scheduled_at: string };
    const todayGame = ((gamesRaw as GameBasic[] | null) ?? []).find((g) => {
      const d = new Date(new Date(g.scheduled_at).getTime() - 3 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10) === today;
    });

    if (!todayGame) return null;

    // Busca config de localização
    const { data: config } = await supabase.from("app_config").select("key, value");
    const map = Object.fromEntries((config ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

    return {
      gameId: (todayGame as { id: string }).id,
      restaurantLat: parseFloat(map.restaurant_lat ?? "-23.550520"),
      restaurantLng: parseFloat(map.restaurant_lng ?? "-46.633309"),
      radiusM: parseInt(map.checkin_radius_m ?? "400", 10),
    };
  } catch {
    return null;
  }
}
