import { FileJson, ShieldCheck, Split, TrendingUp } from "lucide-react";
import { ProofStoryScene } from "./ProofStoryScene";

const beats = [
  {
    icon: ShieldCheck,
    title: "Trust starts false",
    copy: "The UI claim is just a claim until the receipt replays against TxOracle.",
  },
  {
    icon: Split,
    title: "One byte breaks it",
    copy: "Change timestamp, stat key, or fixture. The same verifier must reject it.",
  },
  {
    icon: TrendingUp,
    title: "The match explains the price",
    copy: "Replay Booth turns 0-0, 1-0, 1-1, and 1-2 into the market story.",
  },
  {
    icon: FileJson,
    title: "Evidence survives",
    copy: "Market PDA state and repo evidence remain readable even when devnet tx links age out.",
  },
];

export function StoryWalkthrough({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "story-screen story-screen-compact" : "story-screen"} aria-labelledby="story-title">
      <div className="story-copy">
        <div className="panel-kicker">the proof story</div>
        <h2 id="story-title">
          {compact ? "Proofs live. Forgery fails." : "Verify it. Break it. Then inspect what survived on-chain."}
        </h2>
        <p>
          {compact
            ? "The same wallet-free verifier proves the good receipt and rejects corrupted timestamp, stat key, or fixture inputs."
            : "The first click proves the real receipt. The second click tries to cheat. ParaMarket makes verification falsifiable: the judge can prove the receipt is real by proving the fake ones fail."}
        </p>
        <div className="story-beats">
          {beats.map((beat) => {
            const Icon = beat.icon;
            return (
              <article key={beat.title}>
                <Icon size={18} />
                <strong>{beat.title}</strong>
                <span>{beat.copy}</span>
              </article>
            );
          })}
        </div>
      </div>
      <ProofStoryScene />
    </section>
  );
}
