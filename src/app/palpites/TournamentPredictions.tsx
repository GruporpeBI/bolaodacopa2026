"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { submitTournamentPredictions } from "./actions";
import { teamFlagUrlByName } from "@/lib/team-names";

// 48 seleções classificadas para a Copa do Mundo 2026 — em ordem alfabética PT-BR
const WC_2026_TEAMS = [
  "África do Sul",
  "Alemanha",
  "Arábia Saudita",
  "Argélia",
  "Argentina",
  "Austrália",
  "Áustria",
  "Bélgica",
  "Bósnia e Herzegovina",
  "Brasil",
  "Cabo Verde",
  "Canadá",
  "Catar",
  "Colômbia",
  "Coreia do Sul",
  "Costa do Marfim",
  "Croácia",
  "Curaçao",
  "Egito",
  "Equador",
  "Escócia",
  "Espanha",
  "Estados Unidos",
  "França",
  "Gana",
  "Haiti",
  "Holanda",
  "Inglaterra",
  "Irã",
  "Iraque",
  "Japão",
  "Jordânia",
  "Marrocos",
  "México",
  "Nova Zelândia",
  "Noruega",
  "Panamá",
  "Paraguai",
  "Portugal",
  "R.D. Congo",
  "Rep. Tcheca",
  "Senegal",
  "Suécia",
  "Suíça",
  "Tunísia",
  "Turquia",
  "Uruguai",
  "Uzbequistão",
];

interface Existing {
  semi1: string; semi2: string; sf1_score_a: number; sf1_score_b: number; sf1_tiebreak: string | null;
  semi3: string; semi4: string; sf2_score_a: number; sf2_score_b: number; sf2_tiebreak: string | null;
  finalist1: string; finalist2: string;
  final_score_a: number; final_score_b: number; final_tiebreak: string | null;
  champion: string;
}

interface TournamentPredictionsProps {
  disabled: boolean;
  existing?: Existing | null;
}

function deriveWinner(teamA: string, teamB: string, scoreA: number, scoreB: number, tiebreak: string): string {
  if (scoreA > scoreB) return teamA;
  if (scoreB > scoreA) return teamB;
  return tiebreak; // empate → usa o override
}

function ScoreInput({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="0"
      className="w-14 text-center bg-[#1A1A1A] border border-[#F6C900]/30 text-[#FAF6EB] rounded-sm py-2 text-lg font-bold outline-none focus:border-[#F6C900] disabled:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

function TeamSelect({
  value, onChange, disabled, exclude,
}: { value: string; onChange: (v: string) => void; disabled: boolean; exclude?: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[#1A1A1A] border border-[#F6C900]/30 text-[#FAF6EB] rounded-sm px-3 py-2 text-sm outline-none focus:border-[#F6C900] disabled:opacity-40 min-w-[140px]"
    >
      <option value="">Selecione...</option>
      {WC_2026_TEAMS.filter((t) => !(exclude ?? []).includes(t)).map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

function WinnerBadge({ team, isDraw }: { team: string; isDraw: boolean }) {
  if (!team) return null;
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className={`h-px flex-1 ${isDraw ? "bg-yellow-500/40" : "bg-[#F6C900]/20"}`} />
      <span className={`text-xs font-bold px-3 py-1 rounded-sm ${isDraw ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" : "bg-[#004600] text-[#F6C900] border border-[#F6C900]/30"}`}>
        {isDraw ? "⚠ Empate — escolha quem avança" : `→ ${team}`}
      </span>
      <div className={`h-px flex-1 ${isDraw ? "bg-yellow-500/40" : "bg-[#F6C900]/20"}`} />
    </div>
  );
}

export default function TournamentPredictions({ disabled, existing }: TournamentPredictionsProps) {
  // Bloqueado apenas se já enviou ou se não está logado
  const lock = disabled || !!existing;

  const [semi1, setSemi1] = useState(existing?.semi1 ?? "");
  const [semi2, setSemi2] = useState(existing?.semi2 ?? "");
  const [sf1A, setSf1A] = useState(existing?.sf1_score_a?.toString() ?? "");
  const [sf1B, setSf1B] = useState(existing?.sf1_score_b?.toString() ?? "");
  const [sf1Tie, setSf1Tie] = useState(existing?.sf1_tiebreak ?? "");

  const [semi3, setSemi3] = useState(existing?.semi3 ?? "");
  const [semi4, setSemi4] = useState(existing?.semi4 ?? "");
  const [sf2A, setSf2A] = useState(existing?.sf2_score_a?.toString() ?? "");
  const [sf2B, setSf2B] = useState(existing?.sf2_score_b?.toString() ?? "");
  const [sf2Tie, setSf2Tie] = useState(existing?.sf2_tiebreak ?? "");

  const [finalA, setFinalA] = useState(existing?.final_score_a?.toString() ?? "");
  const [finalB, setFinalB] = useState(existing?.final_score_b?.toString() ?? "");
  const [finalTie, setFinalTie] = useState(existing?.final_tiebreak ?? "");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Derivar finalistas
  const sf1Draw = sf1A !== "" && sf1B !== "" && parseInt(sf1A) === parseInt(sf1B);
  const sf2Draw = sf2A !== "" && sf2B !== "" && parseInt(sf2A) === parseInt(sf2B);

  const finalist1 = semi1 && semi2 && sf1A !== "" && sf1B !== ""
    ? deriveWinner(semi1, semi2, parseInt(sf1A), parseInt(sf1B), sf1Tie)
    : "";
  const finalist2 = semi3 && semi4 && sf2A !== "" && sf2B !== ""
    ? deriveWinner(semi3, semi4, parseInt(sf2A), parseInt(sf2B), sf2Tie)
    : "";

  // Derivar campeão
  const finalDraw = finalA !== "" && finalB !== "" && parseInt(finalA) === parseInt(finalB);
  const champion = finalist1 && finalist2 && finalA !== "" && finalB !== ""
    ? deriveWinner(finalist1, finalist2, parseInt(finalA), parseInt(finalB), finalTie)
    : "";

  const finalReady = finalist1 !== "" && finalist2 !== "" && (!sf1Draw || sf1Tie) && (!sf2Draw || sf2Tie);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!semi1 || !semi2 || !semi3 || !semi4) return setMessage("Preencha todos os semifinalistas.");
    if (sf1A === "" || sf1B === "" || sf2A === "" || sf2B === "") return setMessage("Preencha todos os placares das semifinais.");
    if (sf1Draw && !sf1Tie) return setMessage("Indique quem avança na Semifinal 1 (empate).");
    if (sf2Draw && !sf2Tie) return setMessage("Indique quem avança na Semifinal 2 (empate).");
    if (!finalist1 || !finalist2) return setMessage("Finalistas não determinados.");
    if (finalA === "" || finalB === "") return setMessage("Preencha o placar da final.");
    if (finalDraw && !finalTie) return setMessage("Indique o campeão (final empatada).");
    if (!champion) return setMessage("Campeão não determinado.");

    setMessage("");
    setStatus("loading");
    const result = await submitTournamentPredictions({
      semi1, semi2, sf1_score_a: parseInt(sf1A), sf1_score_b: parseInt(sf1B), sf1_tiebreak: sf1Tie || null,
      semi3, semi4, sf2_score_a: parseInt(sf2A), sf2_score_b: parseInt(sf2B), sf2_tiebreak: sf2Tie || null,
      finalist1, finalist2,
      final_score_a: parseInt(finalA), final_score_b: parseInt(finalB), final_tiebreak: finalTie || null,
      champion,
    });
    if (result.success) { setStatus("success"); setMessage("Palpites do torneio salvos!"); }
    else { setStatus("error"); setMessage(result.error ?? "Erro ao salvar."); }
  }

  const selectClass = "bg-[#1A1A1A] border border-[#F6C900]/30 text-[#FAF6EB] rounded-sm px-3 py-2 text-sm outline-none focus:border-[#F6C900] disabled:opacity-40";

  if (existing && lock) {
    const Flag = ({ name }: { name: string }) => {
      const url = teamFlagUrlByName(name);
      if (!url) return null;
      return <img src={url} alt={name} className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />;
    };

    const TeamName = ({ name }: { name: string }) => (
      <span className="flex items-center gap-1.5">
        <Flag name={name} />
        <span className="text-[#FAF6EB] font-semibold text-sm">{name}</span>
      </span>
    );

    return (
      <Card variant="dark" className="p-5 flex flex-col gap-5">
        <p className="text-xs text-[#FAF6EB]/50 uppercase tracking-wider">Palpites do Torneio — Enviados</p>
        <div className="flex flex-col gap-4">
          {[
            { label: "Semifinal 1", a: existing.semi1, sa: existing.sf1_score_a, sb: existing.sf1_score_b, b: existing.semi2, winner: existing.finalist1 },
            { label: "Semifinal 2", a: existing.semi3, sa: existing.sf2_score_a, sb: existing.sf2_score_b, b: existing.semi4, winner: existing.finalist2 },
          ].map((sf) => (
            <div key={sf.label} className="flex flex-col gap-1.5">
              <span className="text-[#FAF6EB]/40 text-xs uppercase tracking-wider">{sf.label}</span>
              <div className="flex flex-wrap items-center gap-2">
                <TeamName name={sf.a} />
                <span className="text-[#F6C900] font-black">{sf.sa} × {sf.sb}</span>
                <TeamName name={sf.b} />
                <span className="flex items-center gap-1 text-xs bg-[#004600] text-[#F6C900] px-2 py-0.5 rounded-sm">
                  → <Flag name={sf.winner} /><span>{sf.winner}</span>
                </span>
              </div>
            </div>
          ))}
          <div className="border-t border-[#F6C900]/10 pt-3">
            <span className="text-[#FAF6EB]/40 text-xs uppercase tracking-wider">Final</span>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <TeamName name={existing.finalist1} />
              <span className="text-[#F6C900] font-black">{existing.final_score_a} × {existing.final_score_b}</span>
              <TeamName name={existing.finalist2} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[#FAF6EB]/40 text-xs">Campeão:</span>
              <span className="flex items-center gap-1.5 text-[#F6C900] font-bold">
                🏆 <Flag name={existing.champion} />{existing.champion}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#FAF6EB]/30">Palpites do torneio enviados e bloqueados.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="dark" className="p-5 flex flex-col gap-7">
        <div>
          <p className="text-xs text-[#FAF6EB]/50 uppercase tracking-wider mb-0.5">Palpites do Torneio</p>
          <p className="text-[#FAF6EB]/30 text-xs">Obrigatório — preencha antes de enviar palpites de jogo.</p>
        </div>

        {/* ── SEMIFINAL 1 ── */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-bold text-[#F6C900] uppercase tracking-wider">Semifinal 1</span>
          <div className="flex flex-wrap items-center gap-3">
            <TeamSelect value={semi1} onChange={setSemi1} disabled={lock} exclude={[semi2, semi3, semi4]} />
            <ScoreInput value={sf1A} onChange={setSf1A} disabled={lock || !semi1} />
            <span className="text-[#F6C900] font-black text-xl">×</span>
            <ScoreInput value={sf1B} onChange={setSf1B} disabled={lock || !semi2} />
            <TeamSelect value={semi2} onChange={setSemi2} disabled={lock} exclude={[semi1, semi3, semi4]} />
          </div>

          {sf1Draw && semi1 && semi2 && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-yellow-400 text-xs font-semibold">Empate — quem avança?</span>
              <select value={sf1Tie} onChange={(e) => setSf1Tie(e.target.value)} disabled={lock} className={selectClass}>
                <option value="">Selecione...</option>
                <option value={semi1}>{semi1}</option>
                <option value={semi2}>{semi2}</option>
              </select>
            </div>
          )}

          <WinnerBadge team={finalist1} isDraw={sf1Draw && !sf1Tie} />
        </div>

        {/* ── SEMIFINAL 2 ── */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-bold text-[#F6C900] uppercase tracking-wider">Semifinal 2</span>
          <div className="flex flex-wrap items-center gap-3">
            <TeamSelect value={semi3} onChange={setSemi3} disabled={lock} exclude={[semi1, semi2, semi4]} />
            <ScoreInput value={sf2A} onChange={setSf2A} disabled={lock || !semi3} />
            <span className="text-[#F6C900] font-black text-xl">×</span>
            <ScoreInput value={sf2B} onChange={setSf2B} disabled={lock || !semi4} />
            <TeamSelect value={semi4} onChange={setSemi4} disabled={lock} exclude={[semi1, semi2, semi3]} />
          </div>

          {sf2Draw && semi3 && semi4 && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-yellow-400 text-xs font-semibold">Empate — quem avança?</span>
              <select value={sf2Tie} onChange={(e) => setSf2Tie(e.target.value)} disabled={lock} className={selectClass}>
                <option value="">Selecione...</option>
                <option value={semi3}>{semi3}</option>
                <option value={semi4}>{semi4}</option>
              </select>
            </div>
          )}

          <WinnerBadge team={finalist2} isDraw={sf2Draw && !sf2Tie} />
        </div>

        {/* ── FINAL ── */}
        {finalReady && (
          <div className="flex flex-col gap-3 border-t border-[#F6C900]/20 pt-5">
            <span className="text-sm font-bold text-[#F6C900] uppercase tracking-wider">🏆 Final</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#FAF6EB] font-semibold text-sm min-w-[120px]">{finalist1}</span>
              <ScoreInput value={finalA} onChange={setFinalA} disabled={lock} />
              <span className="text-[#F6C900] font-black text-xl">×</span>
              <ScoreInput value={finalB} onChange={setFinalB} disabled={lock} />
              <span className="text-[#FAF6EB] font-semibold text-sm min-w-[120px]">{finalist2}</span>
            </div>

            {finalDraw && finalist1 && finalist2 && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-yellow-400 text-xs font-semibold">Empate — quem vence?</span>
                <select value={finalTie} onChange={(e) => setFinalTie(e.target.value)} disabled={lock} className={selectClass}>
                  <option value="">Selecione...</option>
                  <option value={finalist1}>{finalist1}</option>
                  <option value={finalist2}>{finalist2}</option>
                </select>
              </div>
            )}

            {champion && (
              <div className="flex items-center gap-3 mt-1 bg-[#F6C900]/10 border border-[#F6C900]/30 rounded-sm px-4 py-3">
                <span className="text-[#FAF6EB]/60 text-sm">Campeão:</span>
                <span className="text-[#F6C900] font-black text-lg">🏆 {champion}</span>
              </div>
            )}
          </div>
        )}

        {!finalReady && (
          <div className="flex items-center gap-3 border-t border-[#F6C900]/10 pt-4">
            <div className="h-px flex-1 bg-[#F6C900]/10" />
            <span className="text-[#FAF6EB]/20 text-xs">Final disponível após preencher as semifinais</span>
            <div className="h-px flex-1 bg-[#F6C900]/10" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            variant="green"
            size="sm"
            disabled={lock || status === "loading" || status === "success" || !champion}
            className="self-start"
          >
            {status === "loading" ? "Salvando..." : "Salvar palpites do torneio"}
          </Button>
          {message && (
            <p className={`text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
        </div>
      </Card>
    </form>
  );
}
