import { CheckCircle2, DatabaseZap, ReceiptText, TrendingUp } from "lucide-react";

const steps = [
  { label: "Verify result", detail: "real receipt -> true", icon: CheckCircle2 },
  { label: "Tamper proof", detail: "one field -> reject", icon: ReceiptText },
  { label: "Inspect Market PDA", detail: "settled state live", icon: DatabaseZap },
  { label: "Replay price path", detail: "match story -> lock", icon: TrendingUp },
];

export function JudgeModeRail() {
  return (
    <section className="judge-rail" aria-label="Judge mode checklist">
      <div>
        <strong>Your judge run</strong>
        <span>Four clicks, one complete proof-settled market.</span>
      </div>
      <ol>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.label}>
              <span className="step-number">{index + 1}</span>
              <Icon size={15} />
              <div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
