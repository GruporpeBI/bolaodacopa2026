"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { toggleGameEnabled, toggleGamePredictionsEarly } from "./actions";
import { teamName } from "@/lib/team-names";

interface GameRowProps {
  game: {
    id: string;
    home_team: string;
    away_team: string;
    stage: string;
    scheduled_at: string;
    is_brazil_game: boolean;
    is_final: boolean;
    is_enabled: boolean;
    predictions_early: boolean;
    external_id: number | null;
  };
}

const stageLabel: Record<string, string> = {
  group: "Grupos",
  round_of_16: "Oitavas",
  quarterfinal: "Quartas",
  semifinal: "Semi",
  final: "Final",
};

function Toggle({ checked, onChange, disabled, label }: {
  checked: boolean; onChange: () => void; disabled: boolean; label: string;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? "bg-[#004600]" : "bg-[#FAF6EB]/20"
      }`}
      aria-label={label}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
        checked ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

export default function GameRow({ game }: GameRowProps) {
  const [enabled, setEnabled] = useState(game.is_enabled);
  const [early, setEarly] = useState(game.predictions_early ?? false);
  const [loadingEnabled, setLoadingEnabled] = useState(false);
  const [loadingEarly, setLoadingEarly] = useState(false);

  async function handleToggleEnabled() {
    setLoadingEnabled(true);
    const result = await toggleGameEnabled(game.id, !enabled);
    if (result.success) setEnabled((v) => !v);
    setLoadingEnabled(false);
  }

  async function handleToggleEarly() {
    setLoadingEarly(true);
    const result = await toggleGamePredictionsEarly(game.id, !early);
    if (result.success) setEarly((v) => !v);
    setLoadingEarly(false);
  }

  const dateStr = new Date(game.scheduled_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <tr className="border-b border-[#F6C900]/10 hover:bg-[#F6C900]/5 transition-colors">
      <td className="py-3 pr-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#FAF6EB] font-medium text-sm">
            {teamName(game.home_team)} × {teamName(game.away_team)}
          </span>
          <span className="text-[#FAF6EB]/40 text-xs">{dateStr}</span>
        </div>
      </td>
      <td className="py-3 pr-4">
        <span className="text-[#FAF6EB]/60 text-xs">{stageLabel[game.stage] ?? game.stage}</span>
      </td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap gap-1">
          {game.is_brazil_game && <Badge variant="green">Brasil</Badge>}
          {game.is_final && <Badge variant="gold">Final</Badge>}
        </div>
      </td>
      <td className="py-3 pr-4">
        <Toggle
          checked={enabled}
          onChange={handleToggleEnabled}
          disabled={loadingEnabled}
          label={enabled ? "Desabilitar jogo" : "Habilitar jogo"}
        />
      </td>
      <td className="py-3">
        <div className="flex flex-col items-center gap-0.5">
          <Toggle
            checked={early}
            onChange={handleToggleEarly}
            disabled={loadingEarly}
            label={early ? "Fechar palpite antecipado" : "Abrir palpite antecipado"}
          />
          {early && <span className="text-[#F6C900] text-[9px] font-bold uppercase tracking-wide">Aberto</span>}
        </div>
      </td>
    </tr>
  );
}
