"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import GameRow from "./GameRow";
import ResultModal from "./ResultModal";
import { recalculateScores, checkInUser } from "./actions";
import LocationConfig from "./LocationConfig";
import { AutoSyncButton } from "./AutoSyncButton";

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
  status_type?:             string | null;
  result_locked?:           boolean;
  api_football_fixture_id?: string | null;
  espn_event_id?:           string | null;
  espn_league?:             string | null;
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
  isMaster: boolean;
}

type Tab = "games" | "results" | "attendances" | "localizacao";

export default function AdminTabs({ games, users, attendances, locationConfig, isMaster }: AdminTabsProps) {
  // Abas COMPARTILHADAS (Jogos/Resultados) só com senha mestra
  const [tab, setTab] = useState<Tab>(isMaster ? "games" : "attendances");
  const [recalcStatus, setRecalcStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [recalcMsg, setRecalcMsg] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [masterPwd, setMasterPwd] = useState("");
  const [masterMsg, setMasterMsg] = useState("");

  async function handleMasterUnlock() {
    const res = await fetch("/api/admin/master-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: masterPwd }),
    });
    if (res.ok) { window.location.reload(); }
    else { const d = await res.json().catch(() => ({})); setMasterMsg(d.error ?? "Senha incorreta."); }
  }

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
      <div className="flex flex-wrap items-center border-b border-[#F6C900]/20 mb-6">
        {isMaster && (
          <>
            <button className={tabClass("games")} onClick={() => setTab("games")}>
              Jogos da Copa
            </button>
            <button className={tabClass("results")} onClick={() => setTab("results")}>
              Resultados
            </button>
          </>
        )}
        <button className={tabClass("attendances")} onClick={() => setTab("attendances")}>
          Presenças
        </button>
        {isMaster && (
          <button className={tabClass("localizacao")} onClick={() => setTab("localizacao")}>
            Localização
          </button>
        )}
        {!isMaster && (
          <div className="ml-auto flex items-center gap-2 py-1.5">
            <input
              type="password"
              value={masterPwd}
              onChange={(e) => setMasterPwd(e.target.value)}
              placeholder="Senha mestra"
              className="bg-[#1A1A1A] border border-[#F6C900]/30 text-[#FAF6EB] rounded-sm px-3 py-1.5 text-sm outline-none focus:border-[#F6C900] w-36"
            />
            <button
              onClick={handleMasterUnlock}
              className="text-xs font-bold text-[#F6C900] border border-[#F6C900]/40 rounded-sm px-3 py-1.5 hover:bg-[#F6C900]/10"
            >
              🔓 Jogos/Resultados
            </button>
          </div>
        )}
      </div>
      {!isMaster && masterMsg && (
        <p className="text-red-400 text-xs mb-4">{masterMsg}</p>
      )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enabledGames.map((game) => (
                <div
                  key={game.id}
                  className="flex flex-col gap-3 border border-[#F6C900]/20 rounded px-4 py-4 bg-[#1A1A1A]"
                >
                  {/* Header: match name + date */}
                  <div className="text-center">
                    <p className="text-[#FAF6EB] font-semibold text-sm leading-tight">
                      {game.home_team} × {game.away_team}
                    </p>
                    <p className="text-[#FAF6EB]/40 text-xs mt-1">
                      {new Date(game.scheduled_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Current score */}
                  <div className="text-center">
                    {game.home_score !== null && game.away_score !== null ? (
                      <>
                        <span className="text-[#F6C900] font-bold text-2xl">
                          {game.home_score} – {game.away_score}
                        </span>
                        {game.ball_possession_home !== null && (() => {
                          const hp = game.ball_possession_home!;
                          const team = hp > 50 ? game.home_team : hp < 50 ? game.away_team : null;
                          const pct  = hp > 50 ? hp : 100 - hp;
                          return team ? (
                            <p className="text-[#FAF6EB]/40 text-xs mt-0.5">
                              {team} {pct}% posse
                            </p>
                          ) : null;
                        })()}
                      </>
                    ) : (
                      <span className="text-[#FAF6EB]/25 text-sm">Sem resultado</span>
                    )}
                  </div>

                  {/* Falha de posse: jogo encerrado pela API mas sem posse → input manual */}
                  {game.status_type === "finished" && game.ball_possession_home == null && (
                    <p className="text-xs text-red-400 border border-red-500/30 bg-red-500/5 rounded-sm px-3 py-2 text-center">
                      ⚠ Falha de API posse de bola — faça o input manual
                    </p>
                  )}

                  {/* Auto sync button — centered, full width */}
                  <AutoSyncButton
                    gameId={game.id}
                    hasEspnId={!!game.espn_event_id}
                    hasAfId={!!game.api_football_fixture_id}
                  />

                  {/* Manual edit — secondary action */}
                  <div className="flex justify-center">
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
