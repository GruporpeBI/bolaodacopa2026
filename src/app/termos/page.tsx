import { IconEscudo } from "@/components/icons";

export const metadata = {
  title: "Termos e Condições — Bolão Copa 2026 | Mercearia Amauri",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-[#F6C900] uppercase tracking-wider border-b border-[#F6C900]/20 pb-2">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-[#FAF6EB]/70 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-[#F6C900] mt-1 shrink-0">▸</span>
      <span>{children}</span>
    </li>
  );
}

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#1A1A1A]">
      {/* Header */}
      <section className="bg-gradient-to-b from-[#004600] to-[#1A1A1A] px-6 py-12">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
          <IconEscudo width={48} height={81} />
          <div>
            <p className="text-[#F6C900]/70 text-xs uppercase tracking-widest font-semibold mb-1">
              Copa no Merça — A Casa da Torcida
            </p>
            <h1 className="text-3xl font-bold text-[#F6C900] uppercase tracking-tight">
              Termos e Condições
            </h1>
            <p className="text-[#FAF6EB]/50 text-xs mt-2">
              Bolão Copa do Mundo 2026 — Mercearia Amauri
            </p>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Aviso de data */}
        <div className="bg-[#004600]/30 border border-[#F6C900]/20 rounded-sm px-4 py-3 text-xs text-[#FAF6EB]/50 text-center">
          Última atualização: maio de 2026 — Válido para a Copa do Mundo FIFA 2026
        </div>

        <Section title="1. Sobre a Promoção">
          <P>
            O <strong className="text-[#FAF6EB]">Bolão Copa 2026 — Mercearia Amauri</strong> é uma campanha de
            engajamento promovida pela Mercearia Amauri durante a Copa do Mundo FIFA 2026, realizada nos Estados
            Unidos, Canadá e México.
          </P>
          <P>
            A promoção tem caráter recreativo, sem qualquer cobrança de taxa de participação ou prêmio em
            dinheiro vinculado a apostas financeiras. Os prêmios são definidos exclusivamente pelo organizador.
          </P>
          <P>
            A participação é gratuita e exclusiva para clientes cadastrados que compareçam ao estabelecimento
            durante os jogos selecionados.
          </P>
        </Section>

        <Section title="2. Elegibilidade e Requisitos">
          <ul className="flex flex-col gap-2 list-none">
            <Li>Ter idade igual ou superior a 18 (dezoito) anos na data do cadastro.</Li>
            <Li>Possuir CPF válido e regularmente emitido pela Receita Federal do Brasil.</Li>
            <Li>Fornecer dados verdadeiros, completos e atualizados no formulário de cadastro.</Li>
            <Li>Cada CPF pode ter apenas um cadastro ativo na plataforma.</Li>
            <Li>Não há restrição de quantidade de participantes.</Li>
          </ul>
          <P>
            O organizador reserva-se o direito de desclassificar participantes que forneçam informações
            falsas ou que tentem burlar as regras.
          </P>
        </Section>

        <Section title="3. Regras de Participação">
          <P>
            Os jogos disponíveis para palpite são os <strong className="text-[#FAF6EB]">jogos da Seleção
            Brasileira</strong> e o <strong className="text-[#FAF6EB]">jogo da Final</strong> da Copa do
            Mundo 2026. Os jogos habilitados são definidos pela administração do bolão.
          </P>
          <P>
            <strong className="text-[#FAF6EB]">Prazo para palpites:</strong> cada palpite deve ser enviado
            até 5 (cinco) minutos antes do horário oficial de início da partida. Após esse prazo, o formulário
            é automaticamente bloqueado e não é possível enviar ou alterar palpites.
          </P>
          <P>
            <strong className="text-[#FAF6EB]">Palpites do torneio</strong> (semifinalistas, finalistas e
            campeão) devem ser registrados antes do início do 3º (terceiro) jogo do Brasil na competição.
          </P>
          <P>
            Uma vez confirmado, o palpite <strong className="text-[#FAF6EB]">não pode ser editado ou
            cancelado</strong>.
          </P>
        </Section>

        <Section title="4. Sistema de Pontuação">
          <P>A pontuação é calculada automaticamente após a inserção dos resultados pelo administrador:</P>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#F6C900]/20">
                  <th className="text-[#F6C900] font-bold py-2 pr-4">Evento</th>
                  <th className="text-[#F6C900] font-bold py-2 text-right">Pontos</th>
                </tr>
              </thead>
              <tbody className="text-[#FAF6EB]/70">
                {[
                  ["Presença no restaurante (jogo do Brasil)", "51 pts"],
                  ["Acertou o ganhador (sem placar exato)", "16 pts"],
                  ["Placar exato do jogo", "30 pts"],
                  ["Semifinalista correto (por time, máx. 4)", "27 pts cada"],
                  ["Finalista correto (por time, máx. 2)", "40 pts cada"],
                  ["Campeão correto", "101 pts"],
                  ["Placar exato da final", "121 pts"],
                  ["Presença no restaurante na final", "100 pts"],
                ].map(([ev, pts]) => (
                  <tr key={ev} className="border-b border-[#FAF6EB]/5">
                    <td className="py-2 pr-4">{ev}</td>
                    <td className="py-2 text-right font-bold text-[#F6C900]">{pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="5. Critérios de Desempate">
          <P>
            Em caso de empate na pontuação total, os participantes serão classificados pelos seguintes
            critérios, em ordem de prioridade:
          </P>
          <ol className="flex flex-col gap-2 list-none">
            {[
              "Maior número de presenças verificadas no restaurante durante jogos do Brasil.",
              "Maior número de placares exatos acertados.",
              "Maior número de acertos de ganhador (sem placar exato).",
              "Menor diferença absoluta no percentual de posse de bola previsto versus real.",
              "Palpite do jogo enviado mais cedo (registro de data/hora no sistema).",
              "Sorteio presencial realizado pelo organizador, na presença dos participantes empatados.",
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-[#F6C900] font-bold shrink-0 w-5">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="6. Premiação">
          <P>
            Os prêmios serão divulgados pelo organizador antes do início da Copa do Mundo 2026 e poderão
            incluir consumações, descontos ou brindes no estabelecimento.
          </P>
          <P>
            Os prêmios são pessoais e intransferíveis, não podendo ser convertidos em dinheiro. A
            premiação será entregue presencialmente na Mercearia Amauri.
          </P>
          <P>
            O organizador reserva-se o direito de alterar os prêmios mediante comunicação prévia aos
            participantes cadastrados.
          </P>
        </Section>

        <Section title="7. Verificação de Presença">
          <P>
            A presença nos jogos é verificada presencialmente pela equipe da Mercearia Amauri. O
            participante deve estar presente no estabelecimento durante a partida para ter a presença
            registrada.
          </P>
          <P>
            O check-in é realizado pela equipe do restaurante; não é possível registrar presença de forma
            retroativa ou remota.
          </P>
          <P>
            Cada partida conta apenas uma presença por CPF, independentemente do tempo de permanência.
          </P>
        </Section>

        <Section title="8. Privacidade e Proteção de Dados">
          <P>
            Os dados pessoais coletados (nome, CPF, telefone e data de nascimento) são utilizados
            exclusivamente para identificação, participação e comunicação relacionadas ao Bolão Copa 2026.
          </P>
          <P>
            As informações são armazenadas em ambiente seguro e não serão compartilhadas com terceiros,
            exceto quando exigido por lei ou ordem judicial.
          </P>
          <P>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), o
            participante pode solicitar a exclusão de seus dados a qualquer momento, pelo contato
            disponibilizado na página inicial do site.
          </P>
          <P>
            O ranking público exibirá apenas o primeiro nome e a inicial do sobrenome dos participantes
            (ex.: "João S."), preservando a privacidade dos demais dados.
          </P>
        </Section>

        <Section title="9. Responsabilidades e Limitações">
          <P>
            O organizador não se responsabiliza por falhas de conexão à internet, indisponibilidade
            temporária do sistema ou outros fatores técnicos que impeçam o envio de palpites dentro do
            prazo estabelecido.
          </P>
          <P>
            O sistema registra o horário de envio com base no servidor; o horário do dispositivo do
            participante não é considerado para fins de prazo.
          </P>
          <P>
            Casos de força maior que alterem o calendário da Copa do Mundo (suspensões, adiamentos,
            etc.) serão tratados pelo organizador, com comunicação aos participantes.
          </P>
        </Section>

        <Section title="10. Modificações e Encerramento">
          <P>
            O organizador pode modificar, suspender ou encerrar o bolão a qualquer momento, com
            comunicação prévia aos participantes.
          </P>
          <P>
            Alterações nestes termos entram em vigor imediatamente após publicação nesta página. O uso
            continuado da plataforma após a publicação implica aceitação das novas condições.
          </P>
          <P>
            Em caso de encerramento antecipado, a premiação será calculada com base na pontuação
            acumulada até a data de encerramento.
          </P>
        </Section>

        <Section title="11. Contato e Foro">
          <P>
            Dúvidas, reclamações ou solicitações relacionadas ao Bolão Copa 2026 devem ser dirigidas
            diretamente à equipe da Mercearia Amauri, no estabelecimento ou pelos canais de atendimento
            disponibilizados.
          </P>
          <P>
            Fica eleito o foro da comarca do município sede da Mercearia Amauri para dirimir quaisquer
            controvérsias decorrentes destes termos, com renúncia a qualquer outro, por mais privilegiado
            que seja.
          </P>
        </Section>

        {/* Rodapé dos termos */}
        <div className="border-t border-[#F6C900]/10 pt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-[#FAF6EB]/30 text-xs">
            Ao se cadastrar no Bolão Copa 2026, o participante declara ter lido,
            compreendido e aceito integralmente estes Termos e Condições.
          </p>
          <a
            href="/cadastro"
            className="bg-[#F6C900] hover:bg-[#e6b800] text-[#1A1A1A] font-bold px-8 py-3 rounded-sm text-sm uppercase tracking-wider transition-colors inline-block"
          >
            Voltar ao cadastro
          </a>
        </div>

      </div>
    </main>
  );
}
