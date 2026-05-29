import { createClient } from "@/lib/supabase/server";
import { IconTacaJules } from "@/components/icons";
import Badge from "@/components/ui/Badge";
import RankingTable from "./RankingTable";
import { teamName } from "@/lib/team-names";

export const revalidate = 30;

interface ScoreRow {
  user_id: string;
  user_name: string;
  attendance_pts: number;
  result_pts: number;
  exact_score_pts: number;
  tournament_pts: number;
  total_pts: number;
  updated_at: string;
}

interface GameRankingEntry {
  user_id: string;
  user_name: string;
  home_pred: number;
  away_pred: number;
  pts: number;
}

interface GameRanking {
  gameId: string;
  label: string;
  home_score: number | null;
  away_score: number | null;
  entries: GameRankingEntry[];
}

function gamePts(
  homePred: number,
  awayPred: number,
  homeScore: number,
  awayScore: number,
  isFinal: boolean
): number {
  const isExact = homePred === homeScore && awayPred === awayScore;
  const actualResult = Math.sign(homeScore - awayScore);
  const predResult = Math.sign(homePred - awayPred);
  if (isFinal && isExact) return 121;
  if (isExact) return 30;
  if (actualResult === predResult) return 16;
  return 0;
}

export default async function RankingPage() {
  let top10: ScoreRow[] = [];
  let gameRankings: GameRanking[] = [];

  try {
    const supabase = await createClient();

    // ── Ranking Geral: todos os usuários, top 10 ──
    type UserBasic = { id: string; name: string };
    type ScoreBasic = { user_id: string; attendance_pts: number; result_pts: number; exact_score_pts: number; tournament_pts: number; total_pts: number; updated_at: string };

    const [{ data: allUsersRaw }, { data: scoresRaw }] = await Promise.all([
      supabase.from("users").select("id, name"),
      supabase.from("scores").select("user_id, attendance_pts, result_pts, exact_score_pts, tournament_pts, total_pts, updated_at"),
    ]);
    const allUsers = (allUsersRaw as UserBasic[] | null);
    const scoresData = (scoresRaw as ScoreBasic[] | null);

    const scoreMap = new Map((scoresData ?? []).map((s) => [s.user_id, s]));

    top10 = (allUsers ?? [])
      .map((u) => {
        const s = scoreMap.get(u.id);
        return {
          user_id: u.id,
          user_name: u.name,
          attendance_pts: s?.attendance_pts ?? 0,
          result_pts: s?.result_pts ?? 0,
          exact_score_pts: s?.exact_score_pts ?? 0,
          tournament_pts: s?.tournament_pts ?? 0,
          total_pts: s?.total_pts ?? 0,
          updated_at: s?.updated_at ?? "",
        };
      })
      .sort((a, b) => b.total_pts - a.total_pts)
      .slice(0, 10);

    // ── Ranking por Jogo: jogos com resultado no dia do jogo ou dia seguinte ──
    // Janela: yesterday 00:00 Brasília até hoje 23:59 Brasília
    const nowBrasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayBr = nowBrasilia.toISOString().slice(0, 10);
    const yesterdayBr = new Date(nowBrasilia.getTime() - 86400000).toISOString().slice(0, 10);

    type GameVisible = { id: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; is_final: boolean; scheduled_at: string };

    // Todos os jogos habilitados — sem filtro de resultado
    const { data: allEnabledGamesRaw } = await supabase
      .from("games")
      .select("id, home_team, away_team, home_score, away_score, is_final, scheduled_at")
      .eq("is_enabled", true as unknown as string);

    const allEnabledGames = (allEnabledGamesRaw as GameVisible[] | null) ?? [];

    // Mostra aba de ranking no dia do jogo e no dia seguinte (com ou sem resultado)
    const visibleGames = allEnabledGames.filter((g) => {
      const gDay = new Date(new Date(g.scheduled_at).getTime() - 3 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      return gDay === todayBr || gDay === yesterdayBr;
    });

    if (visibleGames && visibleGames.length > 0) {
      for (const game of visibleGames) {
        // Sem resultado: mostra o jogo no tab mas sem entradas de ranking
        if (game.home_score === null || game.away_score === null) {
          gameRankings.push({
            gameId: game.id,
            label: `${teamName(game.home_team)} × ${teamName(game.away_team)}`,
            home_score: null,
            away_score: null,
            entries: [],
          });
          continue;
        }

        type PredBasic = { user_id: string; home_score_pred: number; away_score_pred: number };
        const { data: predsRaw } = await supabase
          .from("predictions")
          .select("user_id, home_score_pred, away_score_pred")
          .eq("game_id", game.id);
        const preds = predsRaw as PredBasic[] | null;

        if (!preds || preds.length === 0) continue;

        const userIds = preds.map((p) => p.user_id);
        const { data: usersForGameRaw } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);
        const usersForGame = usersForGameRaw as UserBasic[] | null;

        const userNameMap = new Map((usersForGame ?? []).map((u) => [u.id, u.name]));

        const entries: GameRankingEntry[] = preds
          .map((p) => ({
            user_id: p.user_id,
            user_name: userNameMap.get(p.user_id) ?? "Participante",
            home_pred: p.home_score_pred,
            away_pred: p.away_score_pred,
            pts: gamePts(p.home_score_pred, p.away_score_pred, game.home_score!, game.away_score!, game.is_final),
          }))
          .sort((a, b) => b.pts - a.pts);

        gameRankings.push({
          gameId: game.id,
          label: `${teamName(game.home_team)} × ${teamName(game.away_team)}`,
          home_score: game.home_score,
          away_score: game.away_score,
          entries,
        });
      }
    }
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      <section className="bg-gradient-to-b from-[#004600] to-[#1A1A1A] px-6 py-14">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 text-center">
          <IconTacaJules width={56} height={84} />
          <h1 className="text-4xl font-bold text-[#F6C900] uppercase tracking-tight">
            Ranking
          </h1>
          <p className="text-[#FAF6EB]/60 text-sm max-w-md">
            Classificação dos 10 melhores do Bolão Copa 2026 — Mercearia Amauri
          </p>
          <Badge variant="green" className="text-xs">
            Atualizado em tempo real
          </Badge>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {top10.length === 0 && gameRankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Badge variant="dark">Em breve</Badge>
            <p className="text-[#FAF6EB]/50 text-lg">
              O ranking será exibido assim que os participantes se cadastrarem.
            </p>
          </div>
        ) : (
          <RankingTable initialData={top10} gameRankings={gameRankings} />
        )}
      </div>
    </main>
  );
}
