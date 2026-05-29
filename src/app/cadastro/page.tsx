import { IconEscudo, IconBadge2026 } from "@/components/icons";
import CadastroForm from "./CadastroForm";

export default function CadastroPage() {
  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      {/* Hero verde */}
      <section className="bg-gradient-to-b from-[#004600] to-[#1A1A1A] px-6 pt-14 pb-20">
        <div className="max-w-md mx-auto flex flex-col items-center gap-4 text-center">
          <IconEscudo width={56} height={95} />
          <div className="flex flex-col gap-1">
            <p className="text-[#F6C900]/80 text-xs uppercase tracking-widest font-semibold">
              Copa no Merça
            </p>
            <h1 className="text-4xl font-bold text-[#F6C900] uppercase tracking-tight leading-none">
              Participe do Bolão
            </h1>
            <p className="text-[#FAF6EB]/60 text-sm mt-1">
              Cadastre-se, faça seus palpites e dispute prêmios na Mercearia Amauri
            </p>
          </div>
          <IconBadge2026 width={60} height={60} />
        </div>
      </section>

      {/* Card do formulário */}
      <div className="max-w-md mx-auto px-4 -mt-8 pb-16">
        <div className="bg-[#252525] border border-[#F6C900]/10 rounded-sm p-6 shadow-xl">
          <CadastroForm />
        </div>

        {/* Regras rápidas */}
        <div className="mt-6 border border-[#F6C900]/10 rounded-sm p-4">
          <p className="text-[#F6C900] text-xs font-bold uppercase tracking-wider mb-3">
            Como funciona
          </p>
          <ul className="flex flex-col gap-2">
            {[
              ["51 pts", "Presença no restaurante durante jogo do Brasil"],
              ["30 pts", "Placar exato do jogo"],
              ["16 pts", "Acertou o ganhador (sem placar exato)"],
              ["101 pts", "Campeão correto"],
              ["121 pts", "Placar exato da final"],
            ].map(([pts, desc]) => (
              <li key={pts} className="flex items-start gap-3">
                <span className="text-[#F6C900] font-bold text-xs w-16 shrink-0 pt-0.5">{pts}</span>
                <span className="text-[#FAF6EB]/50 text-xs">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
