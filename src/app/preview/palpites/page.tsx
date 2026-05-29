import { IconEscudo } from "@/components/icons";
import Badge from "@/components/ui/Badge";
import GameCard from "@/app/palpites/GameCard";
import TournamentPredictions from "@/app/palpites/TournamentPredictions";

// Dados mock — sem Supabase
const mockGames = [
  {
    id: "1",
    home_team: "Brasil",
    away_team: "México",
    stage: "group",
    scheduled_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // daqui 3h
    is_brazil_game: true,
    is_final: false,
  },
  {
    id: "2",
    home_team: "Brasil",
    away_team: "Alemanha",
    stage: "group",
    scheduled_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // daqui 5 dias
    is_brazil_game: true,
    is_final: false,
  },
  {
    id: "3",
    home_team: "Brasil",
    away_team: "Argentina",
    stage: "semifinal",
    scheduled_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // passado (encerrado)
    is_brazil_game: true,
    is_final: false,
  },
  {
    id: "4",
    home_team: "Brasil",
    away_team: "França",
    stage: "final",
    scheduled_at: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), // daqui 12 dias
    is_brazil_game: true,
    is_final: true,
  },
];

const mockExistingPrediction = {
  home_score_pred: 2,
  away_score_pred: 0,
  possession_pred: 58,
};

export default function PalpitesPreviewPage() {
  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      {/* Banner de preview */}
      <div className="bg-[#F6C900] text-[#1A1A1A] text-center py-2 text-xs font-bold uppercase tracking-widest">
        Modo Preview — Dados de exemplo — sem Supabase
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <IconEscudo width={56} height={95} />
          <div>
            <h1 className="text-3xl font-bold text-[#F6C900] uppercase tracking-tight">
              Meus Palpites
            </h1>
            <p className="text-[#FAF6EB]/50 text-sm mt-1">
              Envie seu palpite até 5 minutos antes de cada jogo
            </p>
          </div>
        </div>

        {/* Seção de jogos */}
        <div className="flex flex-col gap-4 mb-12">
          {/* Jogo 1: aberto, sem palpite */}
          <GameCard game={mockGames[0]} existingPrediction={null} hasTournamentPrediction={true} isLoggedIn={true} isPredictionDay={true} />

          {/* Jogo 2: aberto, com palpite já enviado */}
          <GameCard game={mockGames[1]} existingPrediction={mockExistingPrediction} hasTournamentPrediction={true} isLoggedIn={true} isPredictionDay={true} />

          {/* Jogo 3: encerrado (data passada) */}
          <GameCard game={mockGames[2]} existingPrediction={null} hasTournamentPrediction={true} isLoggedIn={true} isPredictionDay={true} />

          {/* Jogo 4: final, prazo futuro */}
          <GameCard game={mockGames[3]} existingPrediction={null} hasTournamentPrediction={true} isLoggedIn={true} isPredictionDay={true} />
        </div>

        {/* Palpites do torneio */}
        <div className="mb-2">
          <h2 className="text-xl font-bold text-[#FAF6EB] uppercase tracking-tight mb-1">
            Palpites do Torneio
          </h2>
          <p className="text-[#FAF6EB]/40 text-sm mb-4">
            Semifinalistas, finalistas e campeão — disponível durante os 3 primeiros jogos do Brasil.
          </p>
          <TournamentPredictions disabled={false} existing={null} />
        </div>

        {/* Exemplo: torneio já enviado e bloqueado */}
        <div className="mt-8">
          <Badge variant="dark" className="mb-3">Estado: palpites enviados e bloqueados</Badge>
          <TournamentPredictions
            disabled={true}
            existing={{
              semi1: "Brasil", semi2: "França", sf1_score_a: 2, sf1_score_b: 1, sf1_tiebreak: null,
              semi3: "Argentina", semi4: "Portugal", sf2_score_a: 0, sf2_score_b: 0, sf2_tiebreak: "Argentina",
              finalist1: "Brasil", finalist2: "Argentina",
              final_score_a: 3, final_score_b: 1, final_tiebreak: null,
              possession_pred_final: 55,
              champion: "Brasil",
            }}
          />
        </div>
      </div>
    </main>
  );
}
