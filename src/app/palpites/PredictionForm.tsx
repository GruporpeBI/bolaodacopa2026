"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { submitPrediction, selfCheckIn } from "./actions";

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface PredictionFormProps {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  disabled: boolean;
  existingPrediction?: {
    home_score_pred: number;
    away_score_pred: number;
    possession_pred: number;
  } | null;
  showCheckIn?: boolean;
  alreadyCheckedIn?: boolean;
  restaurantLat?: number;
  restaurantLng?: number;
  radiusM?: number;
}

function ScoreInput({
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  error?: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") { onChange(""); return; }
    const n = parseInt(raw, 10);
    if (n > 20) return;
    onChange(String(n)); // remove zeros à esquerda
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#F6C900] uppercase tracking-wider">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="0"
        maxLength={2}
        className={`w-20 text-center bg-[#1A1A1A] border ${error ? "border-red-500" : "border-[#F6C900]/30"} text-[#FAF6EB] rounded-sm px-2 py-3 text-xl font-bold outline-none focus:border-[#F6C900] transition-colors placeholder:text-[#FAF6EB]/30 disabled:opacity-50`}
      />
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}

function PossessionInput({
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  error?: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") { onChange(""); return; }
    const n = parseInt(raw, 10);
    if (n > 100) return;
    onChange(String(n));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#F6C900] uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="50"
          maxLength={3}
          className={`w-20 text-center bg-[#1A1A1A] border ${error ? "border-red-500" : "border-[#F6C900]/30"} text-[#FAF6EB] rounded-sm px-2 py-3 text-xl font-bold outline-none focus:border-[#F6C900] transition-colors placeholder:text-[#FAF6EB]/30 disabled:opacity-50`}
        />
        <span className="text-[#FAF6EB]/40 text-sm">%</span>
      </div>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}

export default function PredictionForm({
  gameId,
  homeTeam,
  awayTeam,
  disabled,
  existingPrediction,
  showCheckIn = false,
  alreadyCheckedIn = false,
  restaurantLat = 0,
  restaurantLng = 0,
  radiusM = 400,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState(
    existingPrediction?.home_score_pred?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    existingPrediction?.away_score_pred?.toString() ?? ""
  );
  const [possession, setPossession] = useState(
    existingPrediction?.possession_pred?.toString() ?? ""
  );
  const [possessionTeam, setPossessionTeam] = useState<"home" | "away">("home");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<"idle" | "locating" | "success" | "far" | "error">(
    alreadyCheckedIn ? "success" : "idle"
  );
  const [checkInMessage, setCheckInMessage] = useState("");

  if (existingPrediction) {
    return (
      <div className="mt-4 border-t border-[#F6C900]/10 pt-4">
        <p className="text-xs text-[#FAF6EB]/50 uppercase tracking-wider mb-3">Seu palpite</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[#FAF6EB]/70 text-sm">{homeTeam}</span>
            <span className="text-[#F6C900] font-bold text-xl">
              {existingPrediction.home_score_pred} × {existingPrediction.away_score_pred}
            </span>
            <span className="text-[#FAF6EB]/70 text-sm">{awayTeam}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-[#FAF6EB]/40">Posse</span>
            <span className="bg-[#004600] text-[#F6C900] font-bold px-2 py-0.5 rounded-sm text-xs">
              {homeTeam}
            </span>
            <span className="text-[#F6C900] font-bold">{existingPrediction.possession_pred}%</span>
          </div>
        </div>
        <p className="text-xs text-[#FAF6EB]/30 mt-2">Palpite já enviado — não é possível editar.</p>
      </div>
    );
  }

  function handleCheckIn() {
    if (!navigator.geolocation) {
      setCheckInStatus("error");
      setCheckInMessage("Geolocalização não suportada neste dispositivo.");
      return;
    }
    setCheckInStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, restaurantLat, restaurantLng);
        if (dist > radiusM) {
          setCheckInStatus("far");
          setCheckInMessage(`Você está a ${Math.round(dist)}m do restaurante. Precisa estar a menos de ${radiusM}m.`);
          return;
        }
        const result = await selfCheckIn(gameId);
        if (result.success) {
          setCheckInStatus("success");
          setCheckInMessage("Presença registrada! +51 pontos no ranking.");
        } else {
          setCheckInStatus("error");
          setCheckInMessage(result.error ?? "Erro ao registrar presença.");
        }
      },
      (err) => {
        setCheckInStatus("error");
        setCheckInMessage(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Habilite nas configurações do browser."
            : "Não foi possível obter sua localização. Tente novamente."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function validate() {
    const errs: Record<string, string> = {};
    const hs = parseInt(homeScore);
    const as_ = parseInt(awayScore);
    const ps = parseInt(possession);
    if (homeScore === "" || isNaN(hs) || hs < 0 || hs > 20) errs.homeScore = "Informe um placar de 0 a 20.";
    if (awayScore === "" || isNaN(as_) || as_ < 0 || as_ > 20) errs.awayScore = "Informe um placar de 0 a 20.";
    if (possession === "" || isNaN(ps) || ps < 50 || ps > 100) errs.possession = "Posse deve ser entre 50% e 100%.";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStatus("loading");

    const possessionValue = possessionTeam === "home"
      ? parseInt(possession)
      : 100 - parseInt(possession);

    const result = await submitPrediction(gameId, parseInt(homeScore), parseInt(awayScore), possessionValue);
    if (result.success) {
      setStatus("success");
      setMessage("Palpite enviado com sucesso!");
    } else {
      setStatus("error");
      setMessage(result.error ?? "Erro ao enviar palpite.");
    }
  }

  const isDisabled = disabled || status === "loading" || status === "success";
  const selectedTeamName = possessionTeam === "home" ? homeTeam : awayTeam;

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-[#F6C900]/10 pt-4 flex flex-col gap-5">
      <p className="text-xs text-[#FAF6EB]/50 uppercase tracking-wider">Seu palpite</p>

      {/* Placar */}
      <div className="flex flex-wrap gap-4 items-end">
        <ScoreInput label={homeTeam} value={homeScore} onChange={setHomeScore} disabled={isDisabled} error={errors.homeScore} />
        <span className="text-[#F6C900] font-bold text-2xl pb-3">×</span>
        <ScoreInput label={awayTeam} value={awayScore} onChange={setAwayScore} disabled={isDisabled} error={errors.awayScore} />
      </div>

      {/* Posse de bola */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-[#F6C900] uppercase tracking-wider">
          Posse de bola (%)
        </span>
        <p className="text-xs text-[#FAF6EB]/40 -mt-1">De qual time você quer prever a posse?</p>

        <div className="flex gap-2">
          {(["home", "away"] as const).map((side) => {
            const name = side === "home" ? homeTeam : awayTeam;
            const active = possessionTeam === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => setPossessionTeam(side)}
                disabled={isDisabled}
                className={`px-4 py-2 rounded-sm text-sm font-semibold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? "bg-[#F6C900] border-[#F6C900] text-[#1A1A1A]"
                    : "bg-transparent border-[#F6C900]/30 text-[#FAF6EB]/60 hover:border-[#F6C900]/60"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        <PossessionInput
          label={`Posse do ${selectedTeamName} (mín. 50%)`}
          value={possession}
          onChange={setPossession}
          disabled={isDisabled}
          error={errors.possession}
        />
      </div>

      <Button
        type="submit"
        variant="gold"
        size="sm"
        disabled={isDisabled}
        className="self-start"
      >
        {status === "loading" ? "Enviando..." : "Enviar palpite"}
      </Button>

      {status === "success" && <p className="text-green-400 text-sm">{message}</p>}
      {status === "error" && <p className="text-red-400 text-sm">{message}</p>}

      {showCheckIn && (
        <div className="border-t border-[#F6C900]/10 pt-4 flex flex-col gap-2">
          {checkInStatus === "success" ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <span>✓</span>
              <span className="font-bold">Presença confirmada no Merça!</span>
              {checkInMessage && <span className="text-[#FAF6EB]/50 text-xs">{checkInMessage}</span>}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkInStatus === "locating"}
                className="flex items-center justify-center gap-2 w-full border border-green-500/40 bg-[#004600] hover:bg-[#005700] text-[#F6C900] font-bold py-3 px-4 rounded-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
              >
                <span>📍</span>
                {checkInStatus === "locating" ? "Obtendo localização..." : "Faça check-in para subir pontuação"}
              </button>
              <p className="text-[#FAF6EB]/30 text-xs text-center">
                Check-in válido para presentes no restaurante
              </p>
              {(checkInStatus === "far" || checkInStatus === "error") && (
                <p className="text-red-400 text-xs text-center">{checkInMessage}</p>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}
