import { BadgeCheck, CircleSlash2, LayoutDashboard, ListChecks, RadioTower, Trophy } from "lucide-react";

const fieldFeatures = [
  {
    feature: "Dense match terminal",
    source: "Ninety-style dashboards",
    decision: "Adapted",
    icon: LayoutDashboard,
    detail: "ParaMarket uses separate workspaces for challenge, replay, markets, proofs, and evidence instead of one long demo page.",
  },
  {
    feature: "First-click challenge",
    source: "Gaffer-style immediacy",
    decision: "Adapted",
    icon: ListChecks,
    detail: "The cold open asks one question: can you make a fake proof pass? The dashboard is earned after interaction.",
  },
  {
    feature: "Commentary around swings",
    source: "Replay booth UX",
    decision: "Adapted",
    icon: RadioTower,
    detail: "The replay explains 0-0, 1-0, 1-1, and 1-2 as deterministic market states tied to the proof-settled outcome.",
  },
  {
    feature: "Wallet-free proof panel",
    source: "TxSettle-class verifier",
    decision: "Exceeded",
    icon: BadgeCheck,
    detail: "Good proof returns true, then three corrupted proofs fail with distinct real guards in the same browser verifier.",
  },
  {
    feature: "Leaderboards, streaks, social hooks",
    source: "Consumer game loops",
    decision: "Skipped",
    icon: Trophy,
    detail: "Useful for retention, but weak for a four-minute settlement-track judge pass. Evidence and falsifiability matter more.",
  },
  {
    feature: "Unproven market breadth",
    source: "Broad prototype pages",
    decision: "Skipped",
    icon: CircleSlash2,
    detail: "ParaMarket keeps the demo narrow: settled devnet markets, deterministic prices, live PDA state, and durable evidence.",
  },
];

export function FieldScan() {
  return (
    <section className="field-scan" aria-labelledby="field-scan-title">
      <div className="panel-kicker">
        <ListChecks size={18} />
        field scan
      </div>
      <div className="field-scan-head">
        <h2 id="field-scan-title">What the strongest products have, and what we kept.</h2>
        <p>
          The field is polished. ParaMarket borrows the useful patterns, then points them at the thing that scores:
          proof-settled verification a judge can falsify.
        </p>
      </div>
      <div className="field-feature-grid">
        {fieldFeatures.map((item) => {
          const Icon = item.icon;
          return (
            <article className={item.decision === "Skipped" ? "field-feature skipped" : "field-feature"} key={item.feature}>
              <div>
                <Icon size={18} />
                <span>{item.decision}</span>
              </div>
              <strong>{item.feature}</strong>
              <small>{item.source}</small>
              <p>{item.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
