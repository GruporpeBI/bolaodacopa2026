"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";

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

interface RankingTableProps {
  initialData: ScoreRow[];
  gameRankings: GameRanking[];
}

const medalColors = [
  "bg-[#F6C900] text-[#1A1A1A]",
  "bg-[#C0C0C0] text-[#1A1A1A]",
  "bg-[#CD7F32] text-[#FAF6EB]",
];
const medalEmojis = ["🥇", "🥈", "🥉"];

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function ptsLabel(pts: number): string {
  if (pts === 30 || pts === 121) return "Placar exato";
  if (pts === 16) return "Acertou Ganhador";
  if (pts === 0) return "Errou";
  return `${pts} pts`;
}

export default function RankingTable({ initialData, gameRankings }: RankingTableProps) {
  const router = useRouter();
  const [data, setData] = useState<ScoreRow[]>(initialData);
  const [tab, setTab] = useState<"geral" | "jogo">("geral");
  const [selectedGame, setSelectedGame] = useState<string>(gameRankings[0]?.gameId ?? "");

  // Atualiza dados do servidor a cada 60 segundos (ranking por jogo + geral)
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

  // Realtime para ranking geral (atualizações imediatas via Supabase)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("scores-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        (payload) => {
          setData((prev) => {
            if (payload.eventType === "INSERT") {
              return [...prev, payload.new as ScoreRow].sort(
                (a, b) => b.total_pts - a.total_pts
              ).slice(0, 10);
            }
            if (payload.eventType === "UPDATE") {
              return prev
                .map((row) =>
                  row.user_id === (payload.new as ScoreRow).user_id
                    ? { ...row, ...(payload.new as ScoreRow) }
                    : row
                )
                .sort((a, b) => b.total_pts - a.total_pts)
                .slice(0, 10);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const top3 = data.slice(0, 3);
  const currentGameRanking = gameRankings.find((g) => g.gameId === selectedGame);

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-[#F6C900]/20 mb-8">
        <button
          onClick={() => setTab("geral")}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            tab === "geral"
              ? "border-[#F6C900] text-[#F6C900]"
              : "border-transparent text-[#FAF6EB]/50 hover:text-[#FAF6EB]"
          }`}
        >
          Ranking Geral
        </button>
        {gameRankings.length > 0 && (
          <button
            onClick={() => setTab("jogo")}
            className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === "jogo"
                ? "border-[#F6C900] text-[#F6C900]"
                : "border-transparent text-[#FAF6EB]/50 hover:text-[#FAF6EB]"
            }`}
          >
            Ranking por Jogo
          </button>
        )}
      </div>

      {/* ── RANKING GERAL ── */}
      {tab === "geral" && (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {top3.map((row, i) => (
                <div
                  key={row.user_id}
                  className={`rounded-sm p-5 flex flex-col items-center gap-2 border ${
                    i === 0
                      ? "border-[#F6C900] bg-[#F6C900]/10"
                      : i === 1
                      ? "border-[#C0C0C0] bg-[#C0C0C0]/10"
                      : "border-[#CD7F32] bg-[#CD7F32]/10"
                  }`}
                >
                  <span className="text-3xl">{medalEmojis[i]}</span>
                  <span className="text-[#FAF6EB] font-bold text-lg text-center">
                    {maskName(row.user_name)}
                  </span>
                  <span className={`text-2xl font-black ${
                    i === 0 ? "text-[#F6C900]" : i === 1 ? "text-[#C0C0C0]" : "text-[#CD7F32]"
                  }`}>
                    {row.total_pts} pts
                  </span>
                  <div className="flex flex-wrap gap-1 justify-center text-xs text-[#FAF6EB]/50">
                    <span>{row.attendance_pts} pres</span>
                    <span>·</span>
                    <span>{row.result_pts} gan</span>
                    <span>·</span>
                    <span>{row.exact_score_pts} placar</span>
                    <span>·</span>
                    <span>{row.tournament_pts} torn</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F6C900]/20 text-[#FAF6EB]/50 text-xs uppercase tracking-wider">
                  <th className="py-3 text-left w-10">#</th>
                  <th className="py-3 text-left">Participante</th>
                  <th className="py-3 text-right">Total</th>
                  <th className="py-3 text-right hidden sm:table-cell">Pres.</th>
                  <th className="py-3 text-right hidden sm:table-cell">Ganhador</th>
                  <th className="py-3 text-right hidden sm:table-cell">Placar</th>
                  <th className="py-3 text-right hidden md:table-cell">Torneio</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const position = idx + 1;
                  return (
                    <tr
                      key={row.user_id}
                      className="border-b border-[#F6C900]/10 hover:bg-[#F6C900]/5 transition-colors"
                    >
                      <td className="py-3.5">
                        {position <= 3 ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${medalColors[position - 1]}`}>
                            {position}
                          </span>
                        ) : (
                          <span className="text-[#FAF6EB]/40 font-mono text-xs pl-1">{position}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-[#FAF6EB] font-medium">{maskName(row.user_name)}</td>
                      <td className="py-3.5 text-right text-[#F6C900] font-bold">{row.total_pts}</td>
                      <td className="py-3.5 text-right text-[#FAF6EB]/60 hidden sm:table-cell">{row.attendance_pts}</td>
                      <td className="py-3.5 text-right text-[#FAF6EB]/60 hidden sm:table-cell">{row.result_pts}</td>
                      <td className="py-3.5 text-right text-[#FAF6EB]/60 hidden sm:table-cell">{row.exact_score_pts}</td>
                      <td className="py-3.5 text-right text-[#FAF6EB]/60 hidden md:table-cell">{row.tournament_pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── RANKING POR JOGO ── */}
      {tab === "jogo" && (
        <div>
          {gameRankings.length > 1 && (
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="mb-6 bg-[#252525] border border-[#F6C900]/20 text-[#FAF6EB] rounded-sm px-4 py-2 text-sm outline-none focus:border-[#F6C900]"
            >
              {gameRankings.map((g) => (
                <option key={g.gameId} value={g.gameId}>{g.label}</option>
              ))}
            </select>
          )}

          {currentGameRanking && (
            <>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <h2 className="text-lg font-bold text-[#FAF6EB]">{currentGameRanking.label}</h2>
                {currentGameRanking.home_score !== null ? (
                  <>
                    <span className="text-[#F6C900] font-black text-xl">
                      {currentGameRanking.home_score} × {currentGameRanking.away_score}
                    </span>
                    <Badge variant="green">Resultado final</Badge>
                  </>
                ) : (
                  <Badge variant="dark">Aguardando resultado</Badge>
                )}
              </div>

              {currentGameRanking.entries.length === 0 ? (
                <p className="text-[#FAF6EB]/40 text-sm py-8 text-center">
                  {currentGameRanking.home_score === null
                    ? "O ranking será exibido após o resultado do jogo."
                    : "Nenhum palpite registrado para este jogo."}
                </p>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F6C900]/20 text-[#FAF6EB]/50 text-xs uppercase tracking-wider">
                      <th className="py-3 text-left w-10">#</th>
                      <th className="py-3 text-left">Participante</th>
                      <th className="py-3 text-center">Palpite</th>
                      <th className="py-3 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentGameRanking.entries.map((entry, idx) => (
                      <tr
                        key={entry.user_id}
                        className="border-b border-[#F6C900]/10 hover:bg-[#F6C900]/5 transition-colors"
                      >
                        <td className="py-3.5">
                          {idx < 3 ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${medalColors[idx]}`}>
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="text-[#FAF6EB]/40 font-mono text-xs pl-1">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3.5 text-[#FAF6EB] font-medium">{maskName(entry.user_name)}</td>
                        <td className="py-3.5 text-center font-bold text-[#FAF6EB]/80">
                          {entry.home_pred} × {entry.away_pred}
                        </td>
                        <td className="py-3.5 text-right">
                          <span className={`font-bold ${entry.pts > 0 ? "text-[#F6C900]" : "text-[#FAF6EB]/30"}`}>
                            {entry.pts > 0 ? `+${entry.pts}` : "0"}
                          </span>
                          <span className="text-[#FAF6EB]/30 text-xs ml-1">{ptsLabel(entry.pts)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
