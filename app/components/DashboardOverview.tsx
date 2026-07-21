import Link from "next/link";
import { ArrowRight, BadgeCheck, DatabaseZap, FileJson, ReceiptText, TrendingUp } from "lucide-react";
import { JudgeModeRail } from "./JudgeModeRail";
import { ProofStoryScene } from "./ProofStoryScene";
import { FieldScan } from "./FieldScan";

const cards = [
  {
    href: "/challenge",
    icon: ReceiptText,
    kicker: "start here",
    title: "Judge Challenge",
    body: "Run the real receipt, then corrupt timestamp, stat key, or fixture and watch TxOracle reject it.",
    stat: "TRUE / 3 rejects",
  },
  {
    href: "/replay",
    icon: TrendingUp,
    kicker: "market tape",
    title: "Replay Booth",
    body: "Follow the Over 2.5 price from live uncertainty to a locked result with deterministic commentary.",
    stat: "19% -> 99.98%",
  },
  {
    href: "/markets",
    icon: DatabaseZap,
    kicker: "live state",
    title: "Market PDA Reader",
    body: "Fetch settled market accounts directly from devnet; no explorer history required.",
    stat: "settled=true",
  },
  {
    href: "/evidence",
    icon: FileJson,
    kicker: "evidence",
    title: "Evidence",
    body: "Receipt proof, tx records, PDA links, tamper logs, and deployed-origin verification in one place.",
    stat: "repo durable",
  },
];

export function DashboardOverview() {
  return (
    <div className="dashboard-board">
      <section className="proof-contrast" aria-label="Proof live contrast">
        <div className="contrast-side field-state">
          <span>common posture</span>
          <strong>88 results decided</strong>
          <p>settlement DISABLED - proof pending</p>
        </div>
        <div className="contrast-vs">vs</div>
        <div className="contrast-side ours-state">
          <span>ParaMarket</span>
          <strong>3 markets settled on-chain</strong>
          <p>proof LIVE - click to verify - click to forge and watch it fail</p>
        </div>
        <div className="contrast-line">Binding finality is the hard part. We bind it and let you attack it.</div>
      </section>

      <section className="command-center">
        <div>
          <div className="workspace-eyebrow">one complete judge loop</div>
          <h2>Watch a market prove itself.</h2>
          <p>
            A goal locks the line, the receipt appears, and the same verifier lets you break a fake proof.
            Start with the challenge, then inspect the chain state.
          </p>
          <Link className="primary-button" href="/challenge">
            Start the challenge <ArrowRight size={17} />
          </Link>
        </div>
        <ProofStoryScene />
      </section>

      <JudgeModeRail />

      <section className="workspace-cards" aria-label="Dashboard workspaces">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} className="workspace-card" key={card.href}>
              <div>
                <span className="card-kicker">
                  <Icon size={15} />
                  {card.kicker}
                </span>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </div>
              <span className="workspace-stat">
                {card.stat}
                <ArrowRight size={15} />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="board-lower-grid">
        <article className="mini-panel">
          <div className="panel-kicker">
            <BadgeCheck size={18} />
            proof status
          </div>
          <strong>Good proof returns true. Fake proofs fail closed.</strong>
          <dl className="mini-stats">
            <div>
              <dt>receipt</dt>
              <dd>true</dd>
            </div>
            <div>
              <dt>timestamp</dt>
              <dd>TimestampMismatch</dd>
            </div>
            <div>
              <dt>stat key</dt>
              <dd>InvalidStatProof</dd>
            </div>
            <div>
              <dt>fixture</dt>
              <dd>InvalidMainTreeProof</dd>
            </div>
          </dl>
        </article>
        <article className="mini-panel">
          <div className="panel-kicker">
            <TrendingUp size={18} />
            replay booth
          </div>
          <strong>0-0 live. 1-0 pressure. 1-1 one goal resolves. 1-2 locked.</strong>
          <div className="mini-river" aria-hidden="true">
            <span style={{ height: "18%" }} />
            <span style={{ height: "24%" }} />
            <span style={{ height: "31%" }} />
            <span style={{ height: "56%" }} />
            <span style={{ height: "96%" }} />
          </div>
        </article>
      </section>

      <FieldScan />
    </div>
  );
}
