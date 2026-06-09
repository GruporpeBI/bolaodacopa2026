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
  poss_team_correct: number; // nº de jogos onde acertou o time dominante — maior = melhor
  poss_proximity: number;    // soma de |possession_pred - ball_possession_home| — menor = melhor
}

interface GameRankingEntry {
  user_id: string;
  user_name: string;
  home_pred: number;
  away_pred: number;
  pts: number;
  poss_team_correct: number; // 1 se acertou o time dominante, 0 se não
  poss_proximity: number;    // |possession_pred - ball_possession_home| para este jogo
  attendance_pts: number;
}

interface GameRanking {
  gameId: string;
  label: string;
  scheduledAt: string;
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
  type LiveGame = { id: string; home_team: string; away_team: string; home_score: number; away_score: number; ball_possession_home: number | null; status_type: string | null; status_description: string | null };
  let liveGames: LiveGame[] = [];

  try {
    const supabase = await createClient();

    // ── Ranking Geral: todos os usuários, top 10 ──
    type UserBasic = { id: string; name: string };
    type ScoreBasic = { user_id: string; attendance_pts: number; result_pts: number; exact_score_pts: number; tournament_pts: number; total_pts: number; updated_at: string };

    // Fetch users, scores, and all games with possession results in parallel
    type GamePoss = { id: string; ball_possession_home: number };
    type PossPred = { user_id: string; game_id: string; possession_pred: number };

    const [
      { data: allUsersRaw },
      { data: scoresRaw },
      { data: gamesWithPossRaw },
    ] = await Promise.all([
      supabase.from("users").select("id, name"),
      supabase.from("scores").select("user_id, attendance_pts, result_pts, exact_score_pts, tournament_pts, total_pts, updated_at"),
      supabase.from("games").select("id, ball_possession_home").eq("is_enabled", true as unknown as string).not("ball_possession_home", "is", null),
    ]);
    const allUsers = (allUsersRaw as UserBasic[] | null);
    const scoresData = (scoresRaw as ScoreBasic[] | null);
    const gamesWithPoss = (gamesWithPossRaw as GamePoss[] | null) ?? [];

    // Compute possession tiebreakers per user across all finished games:
    //   poss_team_correct: how many games they picked the right dominant team (more = better)
    //   poss_proximity:    sum of |possession_pred - ball_possession_home| (less = better)
    const possTeamCorrectMap = new Map<string, number>();
    const possProximityMap   = new Map<string, number>();

    if (gamesWithPoss.length > 0) {
      const { data: allPossPredsRaw } = await supabase
        .from("predictions")
        .select("user_id, game_id, possession_pred")
        .in("game_id", gamesWithPoss.map((g) => g.id));

      const gamePossMap = new Map(gamesWithPoss.map((g) => [g.id, g.ball_possession_home]));

      for (const pred of (allPossPredsRaw as PossPred[] | null) ?? []) {
        const actual = gamePossMap.get(pred.game_id);
        if (actual == null || pred.possession_pred == null) continue;

        // 1 if user picked the correct dominant team (both > 50 or both < 50)
        const correctTeam = (pred.possession_pred > 50) === (actual > 50) ? 1 : 0;
        possTeamCorrectMap.set(pred.user_id, (possTeamCorrectMap.get(pred.user_id) ?? 0) + correctTeam);

        // proximity to exact value
        const diff = Math.abs(pred.possession_pred - actual);
        possProximityMap.set(pred.user_id, (possProximityMap.get(pred.user_id) ?? 0) + diff);
      }
    }

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
          poss_team_correct: possTeamCorrectMap.get(u.id) ?? 0,    // 0 = não acertou nenhum time
          poss_proximity:    possProximityMap.get(u.id) ?? 9999,    // 9999 = sem palpites ainda
        };
      })
      .sort((a, b) => {
        if (b.total_pts !== a.total_pts)                 return b.total_pts - a.total_pts;             // 1. pontos totais
        if (b.poss_team_correct !== a.poss_team_correct) return b.poss_team_correct - a.poss_team_correct; // 2. acertou time dominante
        if (a.poss_proximity !== b.poss_proximity)       return a.poss_proximity - b.poss_proximity;   // 3. mais perto do % exato
        if (b.attendance_pts !== a.attendance_pts)       return b.attendance_pts - a.attendance_pts;   // 4. mais presenças
        if (b.exact_score_pts !== a.exact_score_pts)     return b.exact_score_pts - a.exact_score_pts; // 5. mais placares exatos
        if (b.result_pts !== a.result_pts)               return b.result_pts - a.result_pts;           // 6. mais acertos de ganhador
        return b.poss_team_correct - a.poss_team_correct; // 7. acertos time dominante (critério final)
      })
      .slice(0, 10);

    // ── Jogos ao vivo (com placar atual do Sofascore) ──
    const { data: liveGamesRaw } = await supabase
      .from("games")
      .select("id, home_team, away_team, home_score, away_score, ball_possession_home, status_type, status_description")
      .not("home_score", "is", null)
      .not("status_type", "in", '("finished","canceled","postponed")');
    liveGames = (liveGamesRaw as LiveGame[] | null) ?? [];

    // ── Ranking por Jogo: jogos com resultado no dia do jogo ou dia seguinte ──
    // Janela: yesterday 00:00 Brasília até hoje 23:59 Brasília
    const nowBrasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayBr = nowBrasilia.toISOString().slice(0, 10);
    const yesterdayBr = new Date(nowBrasilia.getTime() - 86400000).toISOString().slice(0, 10);

    type GameVisible = { id: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; ball_possession_home: number | null; is_final: boolean; scheduled_at: string };

    // Todos os jogos habilitados — sem filtro de resultado
    const { data: allEnabledGamesRaw } = await supabase
      .from("games")
      .select("id, home_team, away_team, home_score, away_score, ball_possession_home, is_final, scheduled_at")
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
        type PredBasic = { user_id: string; home_score_pred: number; away_score_pred: number; possession_pred: number | null };
        const { data: predsRaw } = await supabase
          .from("predictions")
          .select("user_id, home_score_pred, away_score_pred, possession_pred")
          .eq("game_id", game.id);
        const preds = predsRaw as PredBasic[] | null;

        const userIds = (preds ?? []).map((p) => p.user_id);
        let userNameMap = new Map<string, string>();
        let attendanceMap = new Map<string, number>();

        if (userIds.length > 0) {
          const [{ data: usersForGameRaw }, { data: scoresForGameRaw }] = await Promise.all([
            supabase.from("users").select("id, name").in("id", userIds),
            supabase.from("scores").select("user_id, attendance_pts").in("user_id", userIds),
          ]);
          userNameMap = new Map((usersForGameRaw as UserBasic[] | null ?? []).map((u) => [u.id, u.name]));
          attendanceMap = new Map((scoresForGameRaw as { user_id: string; attendance_pts: number }[] | null ?? []).map((s) => [s.user_id, s.attendance_pts]));
        }

        const hasResult = game.home_score !== null && game.away_score !== null;
        const actualPoss = game.ball_possession_home ?? null;

        const entries: GameRankingEntry[] = (preds ?? [])
          .map((p) => {
            const pts = hasResult
              ? gamePts(p.home_score_pred, p.away_score_pred, game.home_score!, game.away_score!, game.is_final)
              : 0;

            // 1 se acertou qual time teria mais posse (ambos > 50 ou ambos < 50)
            const possTeamCorrect = (actualPoss != null && p.possession_pred != null)
              ? ((p.possession_pred > 50) === (actualPoss > 50) ? 1 : 0)
              : 0;

            // Proximidade ao valor exato — menor = melhor
            const possProximity = (actualPoss != null && p.possession_pred != null)
              ? Math.abs(p.possession_pred - actualPoss)
              : 9999;

            return {
              user_id:          p.user_id,
              user_name:        userNameMap.get(p.user_id) ?? "Participante",
              home_pred:        p.home_score_pred,
              away_pred:        p.away_score_pred,
              pts,
              poss_team_correct: possTeamCorrect,
              poss_proximity:    possProximity,
              attendance_pts:    attendanceMap.get(p.user_id) ?? 0,
            };
          })
          .sort((a, b) => {
            if (b.pts !== a.pts)                             return b.pts - a.pts;
            if (b.poss_team_correct !== a.poss_team_correct) return b.poss_team_correct - a.poss_team_correct;
            if (a.poss_proximity !== b.poss_proximity)       return a.poss_proximity - b.poss_proximity;
            return b.attendance_pts - a.attendance_pts;
          });

        gameRankings.push({
          gameId: game.id,
          label: `${teamName(game.home_team)} × ${teamName(game.away_team)}`,
          scheduledAt: game.scheduled_at,
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

          {/* Placar ao vivo */}
          {liveGames.length > 0 && (
            <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
              {liveGames.map((g) => (
                <div key={g.id} className="bg-[#004600]/60 border border-green-500/30 rounded-sm px-4 py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
                      {g.status_description ?? "Ao vivo"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="text-[#FAF6EB] font-semibold text-sm">{teamName(g.home_team)}</span>
                    <span className="text-[#F6C900] font-black text-2xl">{g.home_score} × {g.away_score}</span>
                    <span className="text-[#FAF6EB] font-semibold text-sm">{teamName(g.away_team)}</span>
                  </div>
                  {g.ball_possession_home != null && g.ball_possession_home !== 50 && (
                    <p className="text-[#FAF6EB]/50 text-xs text-center mt-0.5">
                      {g.ball_possession_home > 50
                        ? `${teamName(g.home_team)} ${g.ball_possession_home}% posse`
                        : `${teamName(g.away_team)} ${100 - g.ball_possession_home}% posse`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
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
