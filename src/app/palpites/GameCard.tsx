"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CountdownTimer from "./CountdownTimer";
import PredictionForm from "./PredictionForm";
import { teamName, teamFlagUrl } from "@/lib/team-names";

interface GameCardProps {
  game: {
    id: string;
    home_team: string;
    away_team: string;
    stage: string;
    scheduled_at: string;
    is_brazil_game: boolean;
    is_final: boolean;
  };
  existingPrediction?: {
    home_score_pred: number;
    away_score_pred: number;
    possession_pred: number;
  } | null;
  hasTournamentPrediction: boolean;
  isLoggedIn: boolean;
  isPredictionDay: boolean;
  alreadyCheckedIn: boolean;
  isGameDay: boolean;
  restaurantLat: number;
  restaurantLng: number;
  radiusM: number;
}

const stageLabel: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_16: "Oitavas de Final",
  quarterfinal: "Quartas de Final",
  semifinal: "Semifinal",
  final: "Final",
};

export default function GameCard({
  game,
  existingPrediction,
  hasTournamentPrediction,
  isLoggedIn,
  isPredictionDay,
  alreadyCheckedIn,
  isGameDay,
  restaurantLat,
  restaurantLng,
  radiusM,
}: GameCardProps) {
  const [expanded, setExpanded] = useState(false);

  const homeTeam = teamName(game.home_team);
  const awayTeam = teamName(game.away_team);
  const homeFlagUrl = teamFlagUrl(game.home_team);
  const awayFlagUrl = teamFlagUrl(game.away_team);

  const scheduledAt = new Date(game.scheduled_at);
  const deadline = new Date(scheduledAt.getTime() - 5 * 60 * 1000);
  const isPastDeadline = Date.now() >= deadline.getTime();

  const dateStr = scheduledAt.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const timeStr = scheduledAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const canPredict = isLoggedIn && !isPastDeadline && !existingPrediction && isPredictionDay;
  const needsTournament = canPredict && !hasTournamentPrediction;

  function handlePredictClick() {
    setExpanded((v) => !v);
  }

  return (
    <Card variant="dark" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[#FAF6EB]/50 text-xs uppercase tracking-wider">
            {stageLabel[game.stage] ?? game.stage}
          </span>
          {game.is_brazil_game && <Badge variant="green">Brasil</Badge>}
          {game.is_final && <Badge variant="gold">Final</Badge>}
        </div>
        <span className="text-[#FAF6EB]/50 text-xs">
          {dateStr} às {timeStr}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 my-4">
        {/* Home */}
        <div className="flex items-center justify-end gap-2 flex-1">
          <span className="text-[#FAF6EB] font-semibold text-lg text-right">{homeTeam}</span>
          {homeFlagUrl && (
            <img src={homeFlagUrl} alt={homeTeam} className="w-6 h-6 rounded-sm object-cover flex-shrink-0" />
          )}
        </div>

        <span className="text-[#F6C900] font-black text-2xl shrink-0">×</span>

        {/* Away */}
        <div className="flex items-center justify-start gap-2 flex-1">
          {awayFlagUrl && (
            <img src={awayFlagUrl} alt={awayTeam} className="w-6 h-6 rounded-sm object-cover flex-shrink-0" />
          )}
          <span className="text-[#FAF6EB] font-semibold text-lg text-left">{awayTeam}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isPastDeadline ? (
            <span className="text-xs text-red-500 font-bold uppercase tracking-wider">
              Encerrado
            </span>
          ) : isPredictionDay ? (
            <>
              <span className="text-[#FAF6EB]/50 text-xs shrink-0">Fecha em:</span>
              <CountdownTimer target={deadline} />
            </>
          ) : (
            <CountdownTimer target={scheduledAt} />
          )}
        </div>

        {canPredict && !needsTournament && (
          <Button
            variant="gold"
            size="sm"
            onClick={handlePredictClick}
          >
            {expanded ? "Fechar" : "Fazer palpite"}
          </Button>
        )}
      </div>

      {/* Aviso: palpite só no dia do jogo */}
      {!isPredictionDay && !existingPrediction && !isPastDeadline && (
        <p className="text-xs text-[#FAF6EB]/40 mt-2">
          Este palpite poderá ser feito no dia do jogo.
        </p>
      )}

      {/* Aviso quando torneio não preenchido */}
      {needsTournament && (
        <p className="text-xs text-[#F6C900]/70 border border-[#F6C900]/20 rounded-sm px-3 py-2 mt-3">
          Preencha os <span className="font-bold text-[#F6C900]">Palpites do Torneio</span> acima antes de enviar palpites de jogo.
        </p>
      )}

      {(expanded || existingPrediction) && !needsTournament && (
        <PredictionForm
          gameId={game.id}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          disabled={isPastDeadline}
          existingPrediction={existingPrediction}
          showCheckIn={isGameDay}
          alreadyCheckedIn={alreadyCheckedIn}
          restaurantLat={restaurantLat}
          restaurantLng={restaurantLng}
          radiusM={radiusM}
        />
      )}
    </Card>
  );
}
