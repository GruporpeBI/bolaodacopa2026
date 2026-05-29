"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { updateGameResult } from "./actions";
import { teamName } from "@/lib/team-names";

interface ResultModalProps {
  game: {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    ball_possession_home: number | null;
  };
}

function ScoreField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") { onChange(""); return; }
    const n = parseInt(raw, 10);
    if (n > 20) return;
    onChange(String(n));
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#F6C900] uppercase tracking-wider">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        maxLength={2}
        placeholder="0"
        className="w-20 text-center bg-[#1A1A1A] border border-[#F6C900]/30 text-[#FAF6EB] rounded-sm px-2 py-3 text-xl font-bold outline-none focus:border-[#F6C900] transition-colors placeholder:text-[#FAF6EB]/30"
      />
    </div>
  );
}

export default function ResultModal({ game }: ResultModalProps) {
  const [open, setOpen] = useState(false);
  const [homeScore, setHomeScore] = useState(game.home_score?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(game.away_score?.toString() ?? "");
  const [possession, setPossession] = useState(game.ball_possession_home?.toString() ?? "");
  const [possessionTeam, setPossessionTeam] = useState<"home" | "away">("home");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const homeLabel = teamName(game.home_team);
  const awayLabel = teamName(game.away_team);

  function validate() {
    const errs: Record<string, string> = {};
    const hs = parseInt(homeScore);
    const as_ = parseInt(awayScore);
    const ps = parseInt(possession);
    if (homeScore === "" || isNaN(hs) || hs < 0 || hs > 20) errs.home = "Placar inválido (0–20).";
    if (awayScore === "" || isNaN(as_) || as_ < 0 || as_ > 20) errs.away = "Placar inválido (0–20).";
    if (possession === "" || isNaN(ps) || ps < 0 || ps > 100) errs.possession = "Posse inválida (0–100%).";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    const hs = parseInt(homeScore);
    const as_ = parseInt(awayScore);
    const ps = parseInt(possession);
    // Converte para posse do time da casa
    const possessionHome = possessionTeam === "home" ? ps : 100 - ps;

    setStatus("loading");
    const result = await updateGameResult(game.id, hs, as_, possessionHome);

    if (result.success) {
      setStatus("success");
      setMessage("Resultado atualizado e pontuações recalculadas.");
      setTimeout(() => setOpen(false), 1500);
    } else {
      setStatus("error");
      setMessage(result.error ?? "Erro ao atualizar.");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#F6C900] underline underline-offset-2 hover:text-[#D4A800] transition-colors"
      >
        Editar resultado
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-[#1A1A1A] border border-[#F6C900]/20 rounded-sm p-6 w-full max-w-sm">
            <h3 className="text-[#F6C900] font-bold text-lg mb-1">Editar Resultado</h3>
            <p className="text-[#FAF6EB]/50 text-sm mb-6">
              {homeLabel} × {awayLabel}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Placar */}
              <div className="flex flex-wrap gap-4 items-end">
                <ScoreField label={homeLabel} value={homeScore} onChange={setHomeScore} />
                <span className="text-[#F6C900] font-bold text-2xl pb-3">×</span>
                <ScoreField label={awayLabel} value={awayScore} onChange={setAwayScore} />
              </div>
              {(errors.home || errors.away) && (
                <p className="text-red-400 text-xs -mt-3">{errors.home || errors.away}</p>
              )}

              {/* Posse de bola */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#F6C900] uppercase tracking-wider">Posse de bola (%)</span>
                <p className="text-[#FAF6EB]/40 text-xs -mt-1">De qual time?</p>
                <div className="flex gap-2">
                  {(["home", "away"] as const).map((side) => {
                    const label = side === "home" ? homeLabel : awayLabel;
                    const active = possessionTeam === side;
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setPossessionTeam(side)}
                        className={`px-3 py-1.5 rounded-sm text-xs font-bold border transition-all ${
                          active ? "bg-[#F6C900] border-[#F6C900] text-[#1A1A1A]"
                            : "bg-transparent border-[#F6C900]/30 text-[#FAF6EB]/60 hover:border-[#F6C900]/60"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={possession}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      if (raw === "") { setPossession(""); return; }
                      const n = parseInt(raw, 10);
                      if (n > 100) return;
                      setPossession(String(n));
                    }}
                    placeholder="50"
                    maxLength={3}
                    className="w-20 text-center bg-[#1A1A1A] border border-[#F6C900]/30 text-[#FAF6EB] rounded-sm px-2 py-2 text-base font-bold outline-none focus:border-[#F6C900] transition-colors placeholder:text-[#FAF6EB]/30"
                  />
                  <span className="text-[#FAF6EB]/40 text-sm">%</span>
                </div>
                {errors.possession && <p className="text-red-400 text-xs">{errors.possession}</p>}
              </div>

              {message && (
                <p className={`text-sm ${status === "error" ? "text-red-400" : "text-green-400"}`}>
                  {message}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="submit" variant="gold" size="sm" disabled={status === "loading"}>
                  {status === "loading" ? "Salvando..." : "Salvar resultado"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
