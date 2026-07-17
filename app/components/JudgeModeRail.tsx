import { CheckCircle2, DatabaseZap, ReceiptText, TrendingUp } from "lucide-react";

const steps = [
  { label: "Verify result", icon: CheckCircle2 },
  { label: "Tamper proof", icon: ReceiptText },
  { label: "Inspect Market PDA", icon: DatabaseZap },
  { label: "Replay price path", icon: TrendingUp },
];

export function JudgeModeRail() {
  return (
    <section className="judge-rail" aria-label="Judge mode checklist">
      <div>
        <strong>Judge Challenge Mode</strong>
        <span>Can you make this fake proof pass?</span>
      </div>
      <ol>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.label}>
              <span>{index + 1}</span>
              <Icon size={15} />
              {step.label}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
