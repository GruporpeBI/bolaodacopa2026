"use client";

import { useEffect, useState } from "react";

const GROUPS: [string, [string, number][]][] = [
  ["Group A", [["Mexico", 4781], ["South Africa", 4736], ["South Korea", 4735], ["Czechia", 4714]]],
  ["Group B", [["Canada", 4752], ["Bosnia & Herzegovina", 4479], ["Qatar", 4792], ["Switzerland", 4699]]],
  ["Group C", [["Brazil", 4748], ["Morocco", 4778], ["Haiti", 7229], ["Scotland", 4695]]],
  ["Group D", [["USA", 4724], ["Paraguay", 4789], ["Australia", 4741], ["Türkiye", 4700]]],
  ["Group E", [["Germany", 4711], ["Curaçao", 55827], ["Côte d'Ivoire", 4768], ["Ecuador", 4757]]],
  ["Group F", [["Netherlands", 4705], ["Japan", 4770], ["Sweden", 4688], ["Tunisia", 4729]]],
  ["Group G", [["Belgium", 4717], ["Egypt", 4758], ["Iran", 4766], ["New Zealand", 4784]]],
  ["Group H", [["Spain", 4698], ["Cabo Verde", 4753], ["Saudi Arabia", 4834], ["Uruguay", 4725]]],
  ["Group I", [["France", 4481], ["Senegal", 4739], ["Iraq", 4767], ["Norway", 4475]]],
  ["Group J", [["Argentina", 4819], ["Algeria", 4691], ["Austria", 4718], ["Jordan", 4771]]],
  ["Group K", [["Portugal", 4704], ["DR Congo", 4823], ["Uzbekistan", 4723], ["Colombia", 4820]]],
  ["Group L", [["England", 4713], ["Croatia", 4715], ["Ghana", 4764], ["Panama", 5164]]],
];

const REPEATED = [...GROUPS, ...GROUPS];

// Agenda de jogos (fase de grupos) — data + horário + escudos (apenas visual, sem links).
type Match = { time: string; home: [string, number]; away: [string, number] };
type Day = { date: string; label: string; matches: Match[] };

const AGENDA: Day[] = [
  { date: "2026-06-12", label: "12 de jun.", matches: [
    { time: "16:00", home: ["Canada", 4752], away: ["Bosnia & Herzegovina", 4479] },
    { time: "22:00", home: ["USA", 4724], away: ["Paraguay", 4789] },
  ] },
  { date: "2026-06-13", label: "13 de jun.", matches: [
    { time: "16:00", home: ["Qatar", 4792], away: ["Switzerland", 4699] },
    { time: "19:00", home: ["Brazil", 4748], away: ["Morocco", 4778] },
    { time: "22:00", home: ["Haiti", 7229], away: ["Scotland", 4695] },
  ] },
  { date: "2026-06-14", label: "14 de jun.", matches: [
    { time: "01:00", home: ["Australia", 4741], away: ["Türkiye", 4700] },
    { time: "14:00", home: ["Germany", 4711], away: ["Curaçao", 55827] },
    { time: "17:00", home: ["Netherlands", 4705], away: ["Japan", 4770] },
    { time: "20:00", home: ["Côte d'Ivoire", 4768], away: ["Ecuador", 4757] },
    { time: "23:00", home: ["Sweden", 4688], away: ["Tunisia", 4729] },
  ] },
  { date: "2026-06-15", label: "15 de jun.", matches: [
    { time: "13:00", home: ["Spain", 4698], away: ["Cabo Verde", 4753] },
    { time: "16:00", home: ["Belgium", 4717], away: ["Egypt", 4758] },
    { time: "19:00", home: ["Saudi Arabia", 4834], away: ["Uruguay", 4725] },
    { time: "22:00", home: ["Iran", 4766], away: ["New Zealand", 4784] },
  ] },
  { date: "2026-06-16", label: "16 de jun.", matches: [
    { time: "16:00", home: ["France", 4481], away: ["Senegal", 4739] },
    { time: "19:00", home: ["Iraq", 4767], away: ["Norway", 4475] },
    { time: "22:00", home: ["Argentina", 4819], away: ["Algeria", 4691] },
  ] },
  { date: "2026-06-17", label: "17 de jun.", matches: [
    { time: "01:00", home: ["Austria", 4718], away: ["Jordan", 4771] },
    { time: "14:00", home: ["Portugal", 4704], away: ["DR Congo", 4823] },
    { time: "17:00", home: ["England", 4713], away: ["Croatia", 4715] },
    { time: "20:00", home: ["Ghana", 4764], away: ["Panama", 5164] },
    { time: "23:00", home: ["Uzbekistan", 4723], away: ["Colombia", 4820] },
  ] },
  { date: "2026-06-18", label: "18 de jun.", matches: [
    { time: "13:00", home: ["Czechia", 4714], away: ["South Africa", 4736] },
    { time: "16:00", home: ["Switzerland", 4699], away: ["Bosnia & Herzegovina", 4479] },
    { time: "19:00", home: ["Canada", 4752], away: ["Qatar", 4792] },
    { time: "22:00", home: ["Mexico", 4781], away: ["South Korea", 4735] },
  ] },
  { date: "2026-06-19", label: "19 de jun.", matches: [
    { time: "16:00", home: ["USA", 4724], away: ["Australia", 4741] },
    { time: "19:00", home: ["Scotland", 4695], away: ["Morocco", 4778] },
    { time: "21:30", home: ["Brazil", 4748], away: ["Haiti", 7229] },
  ] },
];

export default function WorldCupTicker() {
  // Mostra só os dias a partir de hoje (some matchday passado conforme a Copa anda).
  // Filtra no cliente para evitar mismatch de hidratação (SSR renderiza a lista cheia).
  const [days, setDays] = useState<Day[]>(AGENDA);

  useEffect(() => {
    const todayBr = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const upcoming = AGENDA.filter((d) => d.date >= todayBr);
    setDays(upcoming.length > 0 ? upcoming : AGENDA);
  }, []);

  const AG_REPEATED = [...days, ...days];

  return (
    <>
      <style>{`
        @keyframes wc-ticker { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        .wc-root { position:relative; overflow:hidden; font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        .wc-bg { position:absolute; inset:0; display:flex; flex-direction:column; background:rgb(17,21,23); }
        .wc-bg-flex { flex:1; }
        .wc-row {
          position:relative;
          display:flex; align-items:center; flex-direction:row;
          color:rgb(252,252,254);
          box-shadow:inset 0 0 16px 0 rgba(0,0,0,0.5);
          height:40px; overflow:hidden;
        }
        .wc-lead { flex-shrink:0; display:flex; align-items:center; padding:0 14px; height:100%; }
        .wc-logo { width:24px; height:24px; display:flex; overflow:hidden; border-radius:4px; background:rgb(23,28,31); flex-shrink:0; }
        .wc-logo img { width:100%; height:100%; object-fit:cover; }
        .wc-divider { width:1px; height:40px; flex-shrink:0; background:rgb(35,42,46); }
        .wc-marquee { flex:1; overflow:hidden; padding:8px 0; }
        .wc-agenda { flex:1.4; overflow:hidden; padding:8px 0; }
        .wc-track {
          display:flex; align-items:center; flex-direction:row;
          width:max-content; gap:32px; padding-left:32px;
          animation:wc-ticker 60s linear infinite;
        }
        .wc-agenda .wc-track { animation-duration:80s; gap:28px; }
        .wc-marquee:hover .wc-track, .wc-agenda:hover .wc-track { animation-play-state:paused; }
        .wc-item { display:flex; align-items:center; gap:32px; flex-direction:row; }
        .wc-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.32); flex-shrink:0; }
        .wc-card {
          display:flex; align-items:center; gap:16px; flex-direction:row;
          border-radius:8px; padding:4px 8px; cursor:default;
          transition:background 160ms ease;
        }
        .wc-card:hover { background:rgba(255,255,255,0.08); }
        .wc-name {
          max-width:86px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
          font-size:12px; font-weight:800; color:rgb(255,255,255);
        }
        .wc-flags { display:flex; align-items:center; gap:6px; }
        .wc-flag { width:16px; height:16px; object-fit:cover; font-size:0; display:block; }
        /* Agenda */
        .wc-ag-day { display:flex; align-items:center; gap:12px; flex-direction:row; flex-shrink:0; }
        .wc-ag-date { font-size:12px; font-weight:800; color:rgb(255,255,255); white-space:nowrap; text-transform:uppercase; letter-spacing:.02em; }
        .wc-ag-match {
          display:flex; align-items:center; gap:6px; flex-direction:row;
          padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.06);
        }
        .wc-ag-time { font-size:11px; font-weight:700; color:rgba(255,255,255,0.82); white-space:nowrap; }
        .wc-ag-logo { width:18px; height:18px; object-fit:cover; display:block; flex-shrink:0; }
        .wc-ag-x { font-size:10px; color:rgba(255,255,255,0.45); }
        @media (max-width:720px) {
          .wc-row { height:auto; flex-direction:column; align-items:stretch; }
          .wc-lead { justify-content:center; padding:8px 0; }
          .wc-agenda, .wc-marquee { flex:none; width:100%; }
          .wc-divider { width:100%; height:1px; }
        }
      `}</style>

      <div className="wc-root">
        {/* Blurred colourful SVG background — exact copy from Sofascore */}
        <div className="wc-bg">
          <div className="wc-bg-flex" />
          <svg width="100%" height="75" viewBox="0 0 498 75" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "blur(30px)", display: "block" }}>
            <path d="M-6.86646e-05 24.8062L-7.14566e-05 -4.98523e-05L55.3333 -4.76837e-05C24.7735 -4.69741e-05 -6.98076e-05 11.1059 -6.86646e-05 24.8062Z" fill="#367EC9"/>
            <path d="M110.667 49.6124H166V24.8062L110.667 24.8062L55.3333 24.8062L55.3333 0C24.7736 0 1.52588e-05 11.1059 1.52588e-05 24.8062L0 49.6124V74.4186C30.5597 74.4186 55.3333 63.3127 55.3333 49.6124H55.3533C85.8923 49.6076 110.648 38.5119 110.667 24.8217V49.6124Z" fill="#A30100"/>
            <path d="M166 -9.75361e-05L55.3332 -0.000101873L55.3332 24.8061L110.667 24.8061L166 24.8061L166 49.6123C166 35.9193 190.759 24.8179 221.297 24.8061C221.309 24.8061 221.321 24.8061 221.333 24.8061C190.774 24.8061 166 13.7002 166 -9.75361e-05Z" fill="#E42323"/>
            <path d="M221.285 24.8063L221.333 24.8063H276.667C276.667 37.6503 254.893 48.2141 226.991 49.4844C225.15 49.5682 223.283 49.6116 221.393 49.6125C221.373 49.6125 221.353 49.6125 221.333 49.6125L221.393 49.6125L276.667 49.6125L332 49.6125V74.4187L276.667 74.4187H221.333L166 74.4187L166 49.6125C166 35.9195 190.747 24.8181 221.285 24.8063Z" fill="#185A2C"/>
            <path d="M166 -4.00543e-05C166 13.7002 190.774 24.8062 221.333 24.8062H276.667C276.667 11.1059 251.893 -4.95911e-05 221.333 -4.95911e-05L166 -4.00543e-05Z" fill="#17963F"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M221.333 -0.000105688C251.893 -0.00010449 276.667 11.1058 276.667 24.8061C276.667 37.6501 254.893 48.2139 226.991 49.4842C225.15 49.568 223.283 49.6114 221.393 49.6123L276.667 49.6123L332 49.6123C332 35.912 356.774 24.8061 387.333 24.8061L387.333 -9.91821e-05L221.333 -0.000105688Z" fill="#7BB3EC"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M60.9888 49.4845C59.1293 49.5691 57.2426 49.6125 55.3334 49.6125C55.3334 63.3128 30.5597 74.4187 -1.52588e-05 74.4187L166 74.4187L166 49.6125L110.667 49.6125L110.667 24.8218C110.649 37.6591 88.8807 48.2151 60.9888 49.4845Z" fill="#E06A00"/>
            <path d="M332 49.6125L387.333 49.6125C387.333 63.3128 412.107 74.4187 442.667 74.4187L332 74.4187L332 49.6125Z" fill="#FFD700"/>
            <path d="M387.333 24.8062C356.774 24.8062 332 35.9121 332 49.6124H387.333C387.333 63.3126 412.107 74.4186 442.667 74.4186V49.6124C442.667 36.7684 420.893 26.2045 392.991 24.9342C391.145 24.8502 389.271 24.8068 387.376 24.8062C387.362 24.8062 387.348 24.8062 387.333 24.8062Z" fill="#BD9511"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M392.991 24.9342C420.893 26.2045 442.667 36.7684 442.667 49.6124L442.667 74.4186L498 74.4186V49.6124C467.44 49.6124 442.667 38.5064 442.667 24.8062L387.376 24.8062C389.271 24.8068 391.144 24.8502 392.991 24.9342Z" fill="#A30100"/>
            <path d="M387.376 24.8061L442.667 24.8061C442.667 38.5064 467.44 49.6123 498 49.6123L498 24.8061C498 11.1093 473.239 0.00556467 442.69 -0.00010135C442.682 -0.00010135 442.674 -0.00010135 442.667 -0.000101351L387.333 -0.000103519L387.333 24.8061L387.376 24.8061Z" fill="#2035A5"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M498 0L498 24.8062C498 11.1094 473.239 0.0056653 442.69 0L498 0Z" fill="#E06A00"/>
          </svg>
        </div>

        {/* Content row */}
        <div className="wc-row">
          {/* Logo da Copa */}
          <div className="wc-lead">
            <div className="wc-logo">
              <img src="/api/flag/wc-logo" alt="Copa 2026" />
            </div>
          </div>

          {/* Agenda de jogos (substitui o contador) — apenas visual, sem links */}
          <div className="wc-agenda" aria-label="Agenda de jogos da Copa">
            <div className="wc-track">
              {AG_REPEATED.map((day, i) => (
                <div className="wc-ag-day" key={i}>
                  <span className="wc-ag-date">{day.label}</span>
                  {day.matches.map((m, j) => (
                    <div className="wc-ag-match" key={j}>
                      <span className="wc-ag-time">{m.time}</span>
                      <img className="wc-ag-logo" src={`/api/flag/${m.home[1]}`} alt={m.home[0]} loading="lazy" />
                      <span className="wc-ag-x">×</span>
                      <img className="wc-ag-logo" src={`/api/flag/${m.away[1]}`} alt={m.away[0]} loading="lazy" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="wc-divider" />

          {/* Marquee dos grupos (mantida) */}
          <div className="wc-marquee">
            <div className="wc-track">
              {REPEATED.map(([name, teams], i) => (
                <div className="wc-item" key={i}>
                  <div className="wc-dot" />
                  <div className="wc-card">
                    <span className="wc-name">{name}</span>
                    <div className="wc-flags">
                      {teams.map(([alt, id]) => (
                        <img
                          key={id}
                          className="wc-flag"
                          src={`/api/flag/${id}`}
                          alt={alt}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
