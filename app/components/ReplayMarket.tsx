"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, TrendingUp } from "lucide-react";
import { DEFAULT_LIQUIDITY, WAD, price } from "../../src/pricing/lmsr";

type ReplayEvent = {
  seq: number;
  ts: number;
  action: string;
  gameState: string;
  score: { home: number; away: number };
  h1Goals: { home: number; away: number };
  corners: { home: number; away: number };
};

function pct(wad: bigint) {
  return Number((wad * 10_000n) / WAD) / 100;
}

function wad(n: number) {
  return BigInt(Math.round(n * 1_000_000)) * 1_000_000_000_000n;
}

function quote(event: ReplayEvent) {
  const totalGoals = event.score.home + event.score.away;
  const pressure = event.corners.home + event.corners.away;
  if (totalGoals >= 3) return [price([900n * WAD, 0n], 0, DEFAULT_LIQUIDITY), price([900n * WAD, 0n], 1, DEFAULT_LIQUIDITY)];

  const pressureBoost = Math.min(22, pressure * 1.6 + (event.action.includes("danger") ? 8 : 0));
  const overShares = wad(totalGoals * 54 + pressureBoost);
  const underShares = wad((3 - totalGoals) * 44 + Math.max(0, 10 - pressure) * 1.2);
  const q = [overShares, underShares];
  return [price(q, 0, DEFAULT_LIQUIDITY), price(q, 1, DEFAULT_LIQUIDITY)];
}

export function ReplayMarket() {
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    fetch("/stage4/replay-events.json")
      .then((res) => res.json())
      .then((data) => setEvents(data.events ?? []));
  }, []);

  useEffect(() => {
    if (!playing || events.length === 0) return;
    timer.current = window.setInterval(() => {
      setIdx((current) => {
        if (current >= events.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 520);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [events.length, playing]);

  const event = events[idx] ?? null;
  const prices = useMemo(() => (event ? quote(event) : [0n, 0n]), [event]);
  const overPct = pct(prices[0]);
  const underPct = pct(prices[1]);

  return (
    <section className="replay-panel" aria-labelledby="replay-title">
      <div className="section-head">
        <div>
          <div className="panel-kicker">
            <TrendingUp size={18} />
            historical replay market
          </div>
          <h2 id="replay-title">Live implied probability moves as the match replays.</h2>
        </div>
        <div className="segmented">
          <button onClick={() => setPlaying((v) => !v)} disabled={events.length === 0}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setIdx(0);
              setPlaying(false);
            }}
          >
            <RotateCcw size={17} />
            Reset
          </button>
        </div>
      </div>

      <div className="market-board">
        <div className="score-strip">
          <span>Fixture 18213979</span>
          <strong>{event ? `${event.score.home} - ${event.score.away}` : "loading"}</strong>
          <span>{event ? `seq ${event.seq} · ${event.action.replaceAll("_", " ")}` : "historical stream"}</span>
        </div>
        <div className="price-row">
          <div>
            <div className="price-label">Over 2.5 goals</div>
            <div className="price-value">{overPct.toFixed(2)}%</div>
            <div className="bar"><span style={{ width: `${Math.min(100, overPct)}%` }} /></div>
          </div>
          <div>
            <div className="price-label">Under 2.5 goals</div>
            <div className="price-value">{underPct.toFixed(2)}%</div>
            <div className="bar muted"><span style={{ width: `${Math.min(100, underPct)}%` }} /></div>
          </div>
        </div>
        <div className="event-tape" aria-label="Replay event tape">
          {events.map((item, i) => (
            <button
              key={item.seq}
              className={i === idx ? "active" : ""}
              onClick={() => {
                setIdx(i);
                setPlaying(false);
              }}
              aria-label={`Jump to sequence ${item.seq}`}
            />
          ))}
        </div>
      </div>

      <p className="fine-print">
        Labeling is deliberate: these are deterministic LMSR live quotes for the UI. Final payout remains
        proof-gated and parimutuel on-chain.
      </p>
    </section>
  );
}
