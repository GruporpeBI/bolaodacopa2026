"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import GameRow from "./GameRow";
import ResultModal from "./ResultModal";
import { recalculateScores, checkInUser } from "./actions";
import LocationConfig from "./LocationConfig";

interface Game {
  id: string;
  home_team: string;
  away_team: string;
  stage: string;
  scheduled_at: string;
  is_brazil_game: boolean;
  is_final: boolean;
  is_enabled: boolean;
  predictions_early: boolean;
  ranking_visible: boolean;
  external_id: number | null;
  home_score: number | null;
  away_score: number | null;
  ball_possession_home: number | null;
}

interface UserRow {
  id: string;
  name: string;
}

interface AttendanceRow {
  user_id: string;
  game_id: string;
}

interface AdminTabsProps {
  games: Game[];
  users: UserRow[];
  attendances: AttendanceRow[];
  locationConfig: { lat: number; lng: number; radiusM: number };
}

type Tab = "games" | "results" | "attendances" | "localizacao";

export default function AdminTabs({ games, users, attendances, locationConfig }: AdminTabsProps) {
  const [tab, setTab] = useState<Tab>("games");
  const [recalcStatus, setRecalcStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [recalcMsg, setRecalcMsg] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const enabledGames = games.filter((g) => g.is_enabled);
  const attendanceSet = new Set(attendances.map((a) => `${a.user_id}:${a.game_id}`));

  async function handleRecalc() {
    setRecalcStatus("loading");
    const result = await recalculateScores();
    if (result.success) {
      setRecalcStatus("done");
      setRecalcMsg("Pontuações recalculadas com sucesso.");
    } else {
      setRecalcStatus("error");
      setRecalcMsg(result.error ?? "Erro ao recalcular.");
    }
  }

  async function handleCheckIn(userId: string, gameId: string) {
    setCheckingIn(`${userId}:${gameId}`);
    await checkInUser(userId, gameId);
    setCheckingIn(null);
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
      tab === t
        ? "border-[#F6C900] text-[#F6C900]"
        : "border-transparent text-[#FAF6EB]/50 hover:text-[#FAF6EB]"
    }`;

  return (
    <div>
      <div className="flex border-b border-[#F6C900]/20 mb-6">
        <button className={tabClass("games")} onClick={() => setTab("games")}>
          Jogos da Copa
        </button>
        <button className={tabClass("results")} onClick={() => setTab("results")}>
          Resultados
        </button>
        <button className={tabClass("attendances")} onClick={() => setTab("attendances")}>
          Presenças
        </button>
        <button className={tabClass("localizacao")} onClick={() => setTab("localizacao")}>
          Localização
        </button>
      </div>

      {tab === "games" && (
        <div>
          <div className="mb-5">
            <p className="text-[#FAF6EB]/50 text-sm">
              {games.length} jogo(s) no banco de dados
            </p>
          </div>
          {games.length === 0 ? (
            <p className="text-[#FAF6EB]/40 text-sm py-8 text-center">
              Nenhum jogo encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F6C900]/20 text-[#FAF6EB]/50 text-xs uppercase tracking-wider">
                    <th className="py-3 text-left pr-4">Jogo</th>
                    <th className="py-3 text-left pr-4">Fase</th>
                    <th className="py-3 text-left pr-4">Tags</th>
                    <th className="py-3 text-left pr-4">Habilitar</th>
                    <th className="py-3 text-left">Antecip.</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <GameRow key={game.id} game={game} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "results" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-[#FAF6EB]/50 text-sm">
              {enabledGames.length} jogo(s) habilitado(s)
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalc}
                disabled={recalcStatus === "loading"}
              >
                {recalcStatus === "loading" ? "Recalculando..." : "Recalcular Pontuação"}
              </Button>
              {recalcMsg && (
                <span
                  className={`text-xs ${recalcStatus === "error" ? "text-red-400" : "text-green-400"}`}
                >
                  {recalcMsg}
                </span>
              )}
            </div>
          </div>
          {enabledGames.length === 0 ? (
            <p className="text-[#FAF6EB]/40 text-sm py-8 text-center">
              Nenhum jogo habilitado ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {enabledGames.map((game) => (
                <div
                  key={game.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-[#F6C900]/20 rounded-sm px-5 py-4"
                >
                  <div>
                    <p className="text-[#FAF6EB] font-medium text-sm">
                      {game.home_team} × {game.away_team}
                    </p>
                    <p className="text-[#FAF6EB]/40 text-xs mt-0.5">
                      {new Date(game.scheduled_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {game.home_score !== null && game.away_score !== null ? (
                      <span className="text-[#F6C900] font-bold">
                        {game.home_score} – {game.away_score}
                        {game.ball_possession_home !== null && (
                          <span className="text-[#FAF6EB]/40 font-normal text-xs ml-2">
                            ({game.ball_possession_home}% posse)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[#FAF6EB]/30 text-xs">Sem resultado</span>
                    )}
                    <ResultModal game={game} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "attendances" && (
        <div>
          <p className="text-[#FAF6EB]/50 text-sm mb-5">
            Marque presença manual por usuário e jogo.
          </p>
          {enabledGames.length === 0 || users.length === 0 ? (
            <p className="text-[#FAF6EB]/40 text-sm py-8 text-center">
              Nenhum jogo habilitado ou nenhum usuário cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F6C900]/20 text-[#FAF6EB]/50 text-xs uppercase tracking-wider">
                    <th className="py-3 text-left pr-4 sticky left-0 bg-[#1A1A1A]">
                      Participante
                    </th>
                    {enabledGames.map((g) => (
                      <th key={g.id} className="py-3 text-center px-3 min-w-[80px]">
                        <span className="block text-[10px] leading-tight">
                          {g.home_team.split(" ")[0]}
                          <br />×<br />
                          {g.away_team.split(" ")[0]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#F6C900]/10 hover:bg-[#F6C900]/5 transition-colors"
                    >
                      <td className="py-3 pr-4 sticky left-0 bg-[#1A1A1A] font-medium text-[#FAF6EB]">
                        {user.name}
                      </td>
                      {enabledGames.map((game) => {
                        const key = `${user.id}:${game.id}`;
                        const hasAttendance = attendanceSet.has(key);
                        return (
                          <td key={game.id} className="py-3 text-center px-3">
                            {hasAttendance ? (
                              <span className="text-green-400 text-lg">✓</span>
                            ) : (
                              <button
                                onClick={() => handleCheckIn(user.id, game.id)}
                                disabled={checkingIn === key}
                                className="text-[#FAF6EB]/20 hover:text-[#F6C900] text-lg transition-colors disabled:opacity-50"
                                title="Marcar presença"
                              >
                                {checkingIn === key ? "..." : "○"}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "localizacao" && (
        <div>
          <div className="mb-5">
            <p className="text-[#F6C900] font-bold text-base mb-1">Configuração de Geolocalização</p>
          </div>
          <LocationConfig
            initialLat={locationConfig.lat}
            initialLng={locationConfig.lng}
            initialRadius={locationConfig.radiusM}
          />
        </div>
      )}
    </div>
  );
}
