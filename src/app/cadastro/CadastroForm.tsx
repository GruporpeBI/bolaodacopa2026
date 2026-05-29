"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import BirthDatePicker from "@/components/ui/BirthDatePicker";
import { registerUser, checkCpfExists, loginByCpf } from "./actions";
import RegisterModal from "./RegisterModal";

/* ── helpers ─────────────────────────────────────────────── */

function formatCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function calcAge(date: Date) {
  const t = new Date();
  let age = t.getFullYear() - date.getFullYear();
  const m = t.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < date.getDate())) age--;
  return age;
}

/* ── tipos ───────────────────────────────────────────────── */

type Mode = "login" | "register";
type LoginStatus = "idle" | "checking" | "found" | "not_found" | "error";

/* ── componente principal ────────────────────────────────── */

export default function CadastroForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  /* — estado: modo login — */
  const [loginCpf, setLoginCpf] = useState("");
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* — estado: modo cadastro — */
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regStatus, setRegStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [regMessage, setRegMessage] = useState("");

  /* — efeito: auto-validar CPF do login quando completo — */
  useEffect(() => {
    const digits = loginCpf.replace(/\D/g, "");
    if (digits.length < 11) {
      setLoginStatus("idle");
      setLoginName("");
      setLoginError("");
      return;
    }
    setLoginStatus("checking");
    if (checkRef.current) clearTimeout(checkRef.current);
    checkRef.current = setTimeout(async () => {
      const result = await checkCpfExists(loginCpf);
      if (result.error) {
        setLoginStatus("error");
        setLoginError(result.error);
      } else if (result.found) {
        setLoginStatus("found");
        setLoginName(result.name ?? "");
      } else {
        setLoginStatus("not_found");
        setShowRegisterModal(true);
      }
    }, 400);
  }, [loginCpf]);

  /* — trocar modo: limpa estados — */
  function switchMode(m: Mode) {
    setMode(m);
    setLoginCpf("");
    setLoginStatus("idle");
    setLoginName("");
    setLoginError("");
    setRegErrors({});
    setRegStatus("idle");
    setRegMessage("");
  }

  /* — login: autenticar e redirecionar — geolocalização é pedida na página de palpites — */
  async function handleGoToPalpites() {
    await loginByCpf(loginCpf);
    router.push("/palpites");
  }

  /* — cadastro: validar — */
  function validateRegister() {
    const errs: Record<string, string> = {};
    if (cpf.replace(/\D/g, "").length !== 11) errs.cpf = "CPF inválido.";
    if (!name.trim() || name.trim().split(" ").length < 2) errs.name = "Informe nome e sobrenome.";
    const pd = phone.replace(/\D/g, "");
    if (pd.length < 10 || pd.length > 11) errs.phone = "Telefone inválido.";
    if (!birthDate) {
      errs.birthDate = "Informe sua data de nascimento.";
    } else if (calcAge(birthDate) < 18) {
      errs.birthDate = "Você precisa ter 18 anos ou mais para participar.";
    }
    if (!acceptedTerms) errs.terms = "Você precisa aceitar os termos para continuar.";
    return errs;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateRegister();
    if (Object.keys(errs).length > 0) { setRegErrors(errs); return; }
    setRegErrors({});
    setRegStatus("loading");

    const result = await registerUser({
      name, phone, cpf,
      birth_date: birthDate!.toISOString().split("T")[0],
      accepted_terms: acceptedTerms,
    });

    if (result.success) {
      setRegStatus("success");
      setRegMessage("Cadastro realizado com sucesso! Bem-vindo ao Bolão Mercearia Amauri!");
    } else {
      setRegStatus("error");
      setRegMessage(result.error ?? "Erro ao realizar cadastro.");
    }
  }

  /* — cadastro: tela de sucesso — */
  if (mode === "register" && regStatus === "success") {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[#004600] border-2 border-[#F6C900] flex items-center justify-center text-3xl text-[#F6C900]">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-[#F6C900] uppercase tracking-tight">Cadastro confirmado!</h2>
        <p className="text-[#FAF6EB]/70 max-w-sm">{regMessage}</p>
        <button
          onClick={() => router.push("/palpites")}
          className="mt-2 bg-[#F6C900] hover:bg-[#e6b800] text-[#1A1A1A] font-bold px-8 py-3 rounded-sm text-sm uppercase tracking-wider transition-colors"
        >
          Fazer meus palpites
        </button>
      </div>
    );
  }

  const isRegLoading = regStatus === "loading";

  return (
    <div className="flex flex-col gap-0">

      {/* ── Modal de cadastro automático ── */}
      {showRegisterModal && (
        <RegisterModal
          cpf={loginCpf}
          onClose={() => setShowRegisterModal(false)}
        />
      )}

      {/* ── Tab toggle ── */}
      <div className="flex rounded-sm overflow-hidden border border-[#F6C900]/20 mb-6">
        {(["login", "register"] as Mode[]).map((m) => {
          const label = m === "login" ? "Entrar" : "Criar cadastro";
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                active
                  ? "bg-[#F6C900] text-[#1A1A1A]"
                  : "bg-transparent text-[#FAF6EB]/50 hover:text-[#FAF6EB]/80"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════
          MODO ENTRAR
      ═══════════════════════════════════════ */}
      {mode === "login" && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[#FAF6EB]/40 text-xs mb-4">
              Digite seu CPF para acessar o bolão.
            </p>

            {/* Campo CPF */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#F6C900] uppercase tracking-wider">
                CPF
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={loginCpf}
                  onChange={(e) => setLoginCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  disabled={loginStatus === "found"}
                  className={`w-full bg-[#1A1A1A] border ${
                    loginStatus === "found"
                      ? "border-green-500"
                      : loginStatus === "not_found" || loginStatus === "error"
                      ? "border-red-500"
                      : "border-[#F6C900]/30"
                  } text-[#FAF6EB] rounded-sm px-4 py-3 pr-12 text-base outline-none focus:border-[#F6C900] transition-colors placeholder:text-[#FAF6EB]/30 disabled:opacity-70`}
                />

                {/* Ícone de status à direita */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {loginStatus === "checking" && (
                    <svg className="animate-spin w-5 h-5 text-[#F6C900]/60" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  )}
                  {loginStatus === "found" && (
                    <span className="text-green-400 text-lg font-bold">✓</span>
                  )}
                  {(loginStatus === "not_found" || loginStatus === "error") && (
                    <span className="text-red-400 text-lg font-bold">✕</span>
                  )}
                </div>
              </div>

              {/* Mensagens de status */}
              {loginStatus === "not_found" && (
                <p className="text-red-400 text-xs">
                  CPF não encontrado.{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="underline text-[#F6C900] hover:text-[#e6b800]"
                  >
                    Criar cadastro
                  </button>
                </p>
              )}
              {loginStatus === "error" && (
                <p className="text-red-400 text-xs">{loginError}</p>
              )}
            </div>

            {/* Card de boas-vindas quando CPF encontrado */}
            {loginStatus === "found" && (
              <div className="mt-4 bg-[#004600]/40 border border-green-500/40 rounded-sm px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">
                  ✓
                </div>
                <div>
                  <p className="text-green-400 text-xs font-bold uppercase tracking-wide">CPF verificado</p>
                  {loginName && (
                    <p className="text-[#FAF6EB] text-sm font-semibold mt-0.5">
                      Olá, {loginName.split(" ")[0]}! 👋
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão principal — só ativa quando found */}
          <Button
            type="button"
            variant="gold"
            size="lg"
            disabled={loginStatus !== "found"}
            onClick={handleGoToPalpites}
            className={`transition-opacity ${loginStatus !== "found" ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Ir para meus palpites
          </Button>

          {loginStatus !== "found" && (
            <p className="text-[#FAF6EB]/30 text-xs text-center -mt-2">
              O botão será liberado após a verificação do CPF
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          MODO CRIAR CADASTRO
      ═══════════════════════════════════════ */}
      {mode === "register" && (
        <form onSubmit={handleRegister} className="flex flex-col gap-5">
          <p className="text-[#FAF6EB]/40 text-xs -mt-2 mb-1">
            Preencha seus dados para participar. Apenas maiores de 18 anos.
          </p>

          <Input
            label="CPF"
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            error={regErrors.cpf}
            placeholder="000.000.000-00"
            disabled={isRegLoading}
          />

          <Input
            label="Nome completo"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-ZÀ-Ú\s]/g, ""))}
            error={regErrors.name}
            placeholder="JOÃO DA SILVA"
            autoComplete="name"
            disabled={isRegLoading}
          />

          <Input
            label="Telefone / WhatsApp"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            error={regErrors.phone}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
            disabled={isRegLoading}
          />

          <BirthDatePicker
            value={birthDate}
            onChange={(date) => {
              setBirthDate(date);
              if (date && calcAge(date) < 18) {
                setRegErrors((p) => ({ ...p, birthDate: "Você precisa ter 18 anos ou mais para participar." }));
              } else {
                setRegErrors((p) => { const { birthDate: _, ...rest } = p; return rest; });
              }
            }}
            error={regErrors.birthDate}
            disabled={isRegLoading}
          />

          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={isRegLoading}
                className="mt-0.5 w-4 h-4 accent-[#F6C900] cursor-pointer shrink-0"
              />
              <span className="text-sm text-[#FAF6EB]/70 leading-relaxed">
                Li e aceito os{" "}
                <a href="/termos" target="_blank" className="text-[#F6C900] underline underline-offset-2 hover:text-[#e6b800]">
                  termos e condições
                </a>{" "}
                do Bolão Copa 2026 — Mercearia Amauri.
              </span>
            </label>
            {regErrors.terms && <span className="text-red-400 text-xs ml-7">{regErrors.terms}</span>}
          </div>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            disabled={isRegLoading}
            className="mt-2"
          >
            {isRegLoading ? "Cadastrando..." : "Participar do Bolão"}
          </Button>

          {regStatus === "error" && (
            <p className="text-red-400 text-sm text-center">{regMessage}</p>
          )}
        </form>
      )}

    </div>
  );
}
