import Link from "next/link";
import VideoBackground from "@/components/VideoBackground";
import { IconEscudo, IconBadge2026 } from "@/components/icons";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import AdminButton from "@/components/AdminButton";

const pontuacao = [
  { evento: "Presença no restaurante (jogo Brasil)", pts: 51 },
  { evento: "Acertou o ganhador (sem placar exato)", pts: 16 },
  { evento: "Placar exato", pts: 30 },
  { evento: "Semifinalista correto (cada)", pts: 27 },
  { evento: "Finalista correto (cada)", pts: 40 },
  { evento: "Campeão correto", pts: 101 },
  { evento: "Placar exato da final", pts: 121 },
  { evento: "Presença na final", pts: 100 },
];

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pb-20 text-center overflow-hidden">
        <VideoBackground />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto">
          <IconEscudo width={160} height={271} className="drop-shadow-2xl" />

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-6xl font-bold text-[#F6C900] leading-tight tracking-tight uppercase">
              Copa no Merça
            </h1>
            <p className="text-xl md:text-2xl text-[#FAF6EB] font-medium">
              A Casa da Torcida
            </p>
          </div>

          <p className="text-[#FAF6EB]/80 text-base md:text-lg max-w-lg">
            Faça seus palpites, compareça aos jogos e dispute o ranking da Copa do Mundo 2026.
            <span className="text-[#F6C900] font-semibold"> Pra jogar com a gente, tem que vestir a camisa!</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link href="/cadastro">
              <Button size="lg" variant="gold">
                Participar Agora
              </Button>
            </Link>
            <Link href="/ranking">
              <Button size="lg" variant="outline">
                Ver Ranking
              </Button>
            </Link>
          </div>

          <Badge variant="green" className="text-sm mt-2">
            Copa do Mundo 2026 — Estados Unidos, México &amp; Canadá
          </Badge>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10" aria-hidden="true">
          <div className="w-6 h-10 border-2 border-[#F6C900]/50 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-[#F6C900] rounded-full" />
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-20 px-6 bg-[#FAF6EB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="green" className="mb-4">Como Funciona</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] uppercase">
              Simples assim
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Cadastre-se",
                desc: "Crie sua conta com nome, telefone e CPF. É rápido e gratuito.",
              },
              {
                step: "02",
                title: "Faça seus Palpites",
                desc: "Envie seu palpite de placar até 5 minutos antes de cada jogo do Brasil.",
              },
              {
                step: "03",
                title: "Apareça no Restaurante",
                desc: "Cada presença no Merça durante os jogos vale pontos extras no ranking.",
              },
            ].map((item) => (
              <Card key={item.step} variant="cream" className="relative overflow-hidden">
                <span className="text-7xl font-black text-[#F6C900]/30 absolute top-2 right-4 leading-none">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-2 relative">{item.title}</h3>
                <p className="text-[#1A1A1A]/70 relative">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── PONTUAÇÃO ── */}
      <section className="py-20 px-6 bg-[#1A1A1A]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="gold" className="mb-4">Pontuação</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FAF6EB] uppercase">
              Como ganhar pontos
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {pontuacao.map((item) => (
              <div
                key={item.evento}
                className="flex items-center justify-between gap-4 border border-[#F6C900]/20 rounded-sm px-5 py-4 hover:border-[#F6C900]/50 transition-colors"
              >
                <span className="text-[#FAF6EB]/90">{item.evento}</span>
                <span className="text-[#F6C900] font-black text-xl shrink-0">
                  {item.pts} <span className="text-sm font-normal">pts</span>
                </span>
              </div>
            ))}
          </div>

          <p className="text-[#FAF6EB]/50 text-sm text-center mt-6">
            Em caso de empate, o desempate é por número de presenças, placares exatos, acertos de ganhador, e proximidade na % de posse de bola.
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-6 bg-[#004600] relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none" aria-hidden="true">
          <IconBadge2026 width={300} height={300} />
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10 flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold text-[#F6C900] uppercase leading-tight">
            A Copa começa aqui
          </h2>
          <p className="text-[#FAF6EB]/90 text-lg">
            Cadastre-se agora e não perca nenhum palpite. O time que aparecer mais vai ganhar mais.
          </p>
          <Link href="/cadastro">
            <Button size="lg" variant="gold">
              Criar minha conta
            </Button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1A1A1A] border-t border-[#F6C900]/10 py-8 px-6 text-center text-[#FAF6EB]/40 text-sm">
        <p>© 2026 Mercearia Amauri — Copa do Mundo 2026</p>
        <p className="mt-1">Não somos afiliados à FIFA ou entidades oficiais da Copa do Mundo.</p>
        <AdminButton />
      </footer>
    </main>
  );
}
