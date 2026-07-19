"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { readProofProgress, type ProofProgressKey } from "../lib/proofProgress";

const steps: Array<{ key: ProofProgressKey; label: string; detail: string }> = [
  { key: "verify", label: "Verify proof", detail: "good receipt -> true" },
  { key: "timestamp", label: "Break timestamp", detail: "TimestampMismatch" },
  { key: "stat", label: "Break stat key", detail: "InvalidStatProof" },
  { key: "inspect", label: "Inspect chain state", detail: "Market PDA live" },
];

export function JudgeModeRail() {
  const [progress, setProgress] = useState(readProofProgress);

  useEffect(() => {
    const update = () => setProgress(readProofProgress());
    update();
    window.addEventListener("storage", update);
    window.addEventListener("paramarket-proof-progress", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("paramarket-proof-progress", update);
    };
  }, []);

  const done = useMemo(() => steps.filter((step) => progress[step.key]).length, [progress]);

  return (
    <section className="judge-rail progress-rail" aria-label="Judge mode checklist">
      <div>
        <strong>Judge run</strong>
        <span>{done}/4 done</span>
        <div className="rail-progress" aria-hidden="true">
          <i style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
      </div>
      <ol>
        {steps.map((step, index) => {
          const isDone = progress[step.key];
          return (
            <li className={isDone ? "complete" : ""} key={step.key}>
              <span className="step-number">{isDone ? <CheckCircle2 size={13} /> : index + 1}</span>
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
