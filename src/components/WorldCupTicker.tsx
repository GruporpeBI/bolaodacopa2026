"use client";

import { useEffect, useState } from "react";

const CUP_START = new Date("2026-06-11T16:00:00-03:00");
const STANDINGS_HREF = "https://www.sofascore.com/football/tournament/world/world-championship/16#id:58210,tab:standings";

const GROUPS: [string, [string, number][]][] = [
  ["Grupo A", [["Mexico", 4781], ["South Africa", 4736], ["South Korea", 4735], ["Czechia", 4714]]],
  ["Grupo B", [["Canada", 4752], ["Bosnia & Herzegovina", 4479], ["Qatar", 4792], ["Switzerland", 4699]]],
  ["Grupo C", [["Brazil", 4748], ["Morocco", 4778], ["Haiti", 7229], ["Scotland", 4695]]],
  ["Grupo D", [["USA", 4724], ["Paraguay", 4789], ["Australia", 4741], ["Türkiye", 4700]]],
  ["Grupo E", [["Germany", 4711], ["Curaçao", 55827], ["Côte d'Ivoire", 4768], ["Ecuador", 4757]]],
  ["Grupo F", [["Netherlands", 4705], ["Japan", 4770], ["Sweden", 4688], ["Tunisia", 4729]]],
  ["Grupo G", [["Belgium", 4717], ["Egypt", 4758], ["Iran", 4766], ["New Zealand", 4784]]],
  ["Grupo H", [["Spain", 4698], ["Cabo Verde", 4753], ["Saudi Arabia", 4834], ["Uruguay", 4725]]],
  ["Grupo I", [["France", 4481], ["Senegal", 4739], ["Iraq", 4767], ["Norway", 4475]]],
  ["Grupo J", [["Argentina", 4819], ["Algeria", 4691], ["Austria", 4718], ["Jordan", 4771]]],
  ["Grupo K", [["Portugal", 4704], ["DR Congo", 4823], ["Uzbekistan", 4723], ["Colombia", 4820]]],
  ["Grupo L", [["England", 4713], ["Croatia", 4715], ["Ghana", 4764], ["Panama", 5164]]],
];

const repeated = [...GROUPS, ...GROUPS];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function WorldCupTicker() {
  const [countdown, setCountdown] = useState({ days: "00", hours: "00", minutes: "00", seconds: "00" });

  useEffect(() => {
    function update() {
      const diff = Math.max(0, CUP_START.getTime() - Date.now());
      setCountdown({
        days: pad(Math.floor(diff / 86400000)),
        hours: pad(Math.floor((diff / 3600000) % 24)),
        minutes: pad(Math.floor((diff / 60000) % 60)),
        seconds: pad(Math.floor((diff / 1000) % 60)),
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{`
        .wc-strip {
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          color: rgb(252,252,254);
          background: rgb(17,21,23);
          box-shadow: inset 0 0 16px rgba(0,0,0,0.25);
          overflow: hidden;
          flex-shrink: 0;
        }
        .wc-countdown-link, .wc-group-link { color: inherit; text-decoration: none; }
        .wc-countdown {
          min-width: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 8px 16px;
          transition: background 160ms ease;
          height: 100%;
        }
        .wc-countdown:hover, .wc-group-card:hover { background: rgba(255,255,255,0.08); }
        .wc-logo-box {
          width: 24px; height: 24px;
          display: flex; overflow: hidden;
          border-radius: 4px;
          background: rgb(23,28,31);
          flex-shrink: 0;
        }
        .wc-logo-box img { width: 100%; height: 100%; object-fit: cover; }
        .wc-time { display: flex; align-items: baseline; font-weight: 800; }
        .wc-number, .wc-separator { font-size: 18px; line-height: 1.33; }
        .wc-label { margin-left: 2px; font-size: 12px; text-transform: uppercase; }
        .wc-separator { margin: 0 6px; }
        .wc-divider { width: 1px; height: 40px; flex: 0 0 auto; background: rgb(35,42,46); }
        .wc-marquee { flex: 1; overflow: hidden; padding: 8px 0; }
        .wc-track {
          display: flex; align-items: center;
          width: max-content; gap: 32px; padding-left: 32px;
          animation: wc-ticker 60s linear infinite;
        }
        .wc-marquee:hover .wc-track { animation-play-state: paused; }
        .wc-group { display: flex; align-items: center; gap: 32px; }
        .wc-dot { width: 6px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.32); }
        .wc-group-card {
          display: flex; align-items: center; gap: 16px;
          padding: 4px 8px; border-radius: 8px;
          transition: background 160ms ease;
        }
        .wc-group-name {
          max-width: 86px; overflow: hidden;
          color: rgb(255,255,255); font-size: 12px; font-weight: 800;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .wc-flags { display: flex; align-items: center; gap: 6px; }
        .wc-flag { width: 16px; height: 16px; border-radius: 0; }
        @keyframes wc-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (max-width: 720px) {
          .wc-strip { height: auto; align-items: stretch; flex-direction: column; }
          .wc-countdown { min-width: 0; }
          .wc-divider { width: 100%; height: 1px; }
          .wc-marquee { width: 100%; }
        }
      `}</style>

      <div className="wc-strip">
        <a className="wc-countdown-link" href="https://www.sofascore.com/football/tournament/world/world-championship/16">
          <div className="wc-countdown">
            <div className="wc-logo-box">
              <img src="https://www.sofascore.com/static/images/tournaments/world-cup-2026-logo.webp" alt="World Cup 2026" />
            </div>
            <div className="wc-time" aria-label="Contagem regressiva para a Copa do Mundo">
              <span className="wc-number">{countdown.days}</span><span className="wc-label">d</span>
              <span className="wc-separator">:</span>
              <span className="wc-number">{countdown.hours}</span><span className="wc-label">h</span>
              <span className="wc-separator">:</span>
              <span className="wc-number">{countdown.minutes}</span><span className="wc-label">m</span>
              <span className="wc-separator">:</span>
              <span className="wc-number">{countdown.seconds}</span><span className="wc-label">s</span>
            </div>
          </div>
        </a>

        <div className="wc-divider" />

        <div className="wc-marquee">
          <div className="wc-track">
            {repeated.map(([name, teams], i) => (
              <div className="wc-group" key={i}>
                <div className="wc-dot" />
                <a className="wc-group-link" href={STANDINGS_HREF}>
                  <div className="wc-group-card">
                    <span className="wc-group-name">{name}</span>
                    <div className="wc-flags">
                      {teams.map(([teamName, teamId]) => (
                        <img
                          key={teamId}
                          className="wc-flag"
                          src={`https://img.sofascore.com/api/v1/team/${teamId}/image`}
                          alt={teamName}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
